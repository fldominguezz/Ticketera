from fastapi import FastAPI
from contextlib import asynccontextmanager
from typing import AsyncIterator
import logging
import asyncio
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import limiter
from app.db.session import engine, AsyncSessionLocal
from app.core.observability import setup_observability 

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Conectar DB al arranque
    app.state.db_engine = engine
    app.state.async_session_local = AsyncSessionLocal
    
    # Iniciar chequeo de disco en background
    asyncio.create_task(periodic_disk_check())
    
    yield

async def periodic_disk_check():
    """Chequea el espacio en disco cada hora y notifica a los admins si es crítico (<10%)."""
    import shutil
    from app.services.notification_service import notification_service
    
    while True:
        try:
            total, used, free = shutil.disk_usage("/")
            percent_free = (free / total) * 100
            
            if percent_free < 10:
                async with AsyncSessionLocal() as db:
                    await notification_service.notify_admins(
                        db,
                        title="⚠️ ALERTA DE SISTEMA",
                        message=f"Espacio en disco crítico: {percent_free:.1f}% disponible.",
                        link="/admin/system"
                    )
                    await db.commit()
        except Exception as e:
            logger.error(f"Error en chequeo de disco: {e}")
            
        await asyncio.sleep(3600) # Chequear cada hora

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

@app.get("/healthz", tags=["health"])
async def healthz():
    """Minimal healthcheck endpoint."""
    return {"status": "ok"}

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

setup_observability(app)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global Exception: {str(exc)}", exc_info=True)
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."},
    )

app.router.redirect_slashes = False

# INYECCIÓN DIFERIDA DE ROUTERS PARA EVITAR IMPORTACIONES CIRCULARES
def include_routers(app: FastAPI):
    from app.api.v1.routers import (
        auth, users, sessions, groups, tickets, audit, integrations, 
        notifications, ai_assistant, workflows, settings as sys_settings, 
        sla, iam, dashboard, system, forms, assets, ticket_types, 
        locations, expedientes, admin_configs, daily_reports, soc, soc_ws,
        attachments, endpoints, forensics, plugins
    )

    app.include_router(soc_ws.router, prefix=f"{settings.API_V1_STR}", tags=["websockets"])
    app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
    app.include_router(expedientes.router, prefix=f"{settings.API_V1_STR}/expedientes", tags=["expedientes"])
    app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
    app.include_router(sessions.router, prefix=f"{settings.API_V1_STR}/sessions", tags=["sessions"])
    app.include_router(iam.router, prefix=f"{settings.API_V1_STR}", tags=["iam"])
    app.include_router(groups.router, prefix=f"{settings.API_V1_STR}/groups", tags=["groups"])
    app.include_router(tickets.router, prefix=f"{settings.API_V1_STR}/tickets", tags=["tickets"])
    app.include_router(assets.router, prefix=f"{settings.API_V1_STR}/assets", tags=["assets"])
    app.include_router(attachments.router, prefix=f"{settings.API_V1_STR}/attachments", tags=["attachments"])
    app.include_router(endpoints.router, prefix=f"{settings.API_V1_STR}/endpoints", tags=["endpoints"])
    app.include_router(forensics.router, prefix=f"{settings.API_V1_STR}/forensics", tags=["forensics"])
    app.include_router(plugins.router, prefix=f"{settings.API_V1_STR}/plugins", tags=["plugins"])
    app.include_router(ticket_types.router, prefix=f"{settings.API_V1_STR}/ticket-types", tags=["ticket-types"])
    app.include_router(audit.router, prefix=f"{settings.API_V1_STR}/audit", tags=["audit"])
    app.include_router(integrations.router, prefix=f"{settings.API_V1_STR}/integrations", tags=["integrations"])
    app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["notifications"])
    app.include_router(ai_assistant.router, prefix=f"{settings.API_V1_STR}/ai", tags=["ai"])
    app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"])
    app.include_router(locations.router, prefix=f"{settings.API_V1_STR}/locations", tags=["locations"])
    app.include_router(workflows.router, prefix=f"{settings.API_V1_STR}/admin/workflows", tags=["admin-workflows"])
    app.include_router(sys_settings.router, prefix=f"{settings.API_V1_STR}/admin/settings", tags=["admin-settings"])
    app.include_router(sla.router, prefix=f"{settings.API_V1_STR}/admin/sla", tags=["admin-sla"])
    app.include_router(system.router, prefix=f"{settings.API_V1_STR}/admin/system", tags=["admin-system"])
    app.include_router(forms.router, prefix=f"{settings.API_V1_STR}/forms", tags=["forms"])
    app.include_router(admin_configs.router, prefix=f"{settings.API_V1_STR}/admin/configs", tags=["admin-configs"])
    app.include_router(daily_reports.router, prefix=f"{settings.API_V1_STR}/reports/daily", tags=["daily-reports"])
    app.include_router(soc.router, prefix=f"{settings.API_V1_STR}/soc", tags=["soc"])
    
    # ALIAS DIRECTO PARA SIEM (Coincide con URL del usuario)
    app.post(f"{settings.API_V1_STR}/fortisiem-incident", tags=["integrations"], include_in_schema=False)(integrations.fortisiem_incident_webhook)

include_routers(app)
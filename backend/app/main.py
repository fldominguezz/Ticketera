from fastapi import FastAPI
from contextlib import asynccontextmanager
from typing import AsyncIterator
import logging
import asyncio
import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.core.limiter import limiter
from app.db.session import engine, AsyncSessionLocal
from app.core.observability import setup_observability 
logger = logging.getLogger(__name__)
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.db_engine = engine
    app.state.async_session_local = AsyncSessionLocal
    yield
    await engine.dispose()
app = FastAPI(title=settings.PROJECT_NAME, version="1.0.0", lifespan=lifespan)
# Configuración de CORS
origins = [
    f"http://{settings.DOMAIN_NAME}",
    f"https://{settings.DOMAIN_NAME}",
    f"http://{settings.DOMAIN_NAME}:3000",
    f"http://{settings.DOMAIN_NAME}:3006",
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:3006",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Servir archivos estáticos
if not os.path.exists("/app/uploads"):
    os.makedirs("/app/uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="/app/uploads"), name="uploads")
# Observabilidad y Limites
setup_observability(app)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
# IMPORTACIÓN DE ROUTERS
from app.api.v1.routers import (
    auth, users, sessions, groups, tickets, audit, integrations, 
    notifications, ai_assistant, workflows, settings as sys_settings, 
    sla, iam, dashboard, system, forms, assets, ticket_types, 
    locations, expedientes, admin_configs, daily_reports, soc, soc_ws,
    attachments, endpoints, forensics, plugins, search, oidc, health
)
v1 = settings.API_V1_STR # /api/v1
# Registro de Rutas
app.include_router(health.router, prefix=v1, tags=["system"])
app.include_router(auth.router, prefix=f"{v1}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{v1}/users", tags=["users"])
app.include_router(groups.router, prefix=f"{v1}/groups", tags=["groups"])
app.include_router(tickets.router, prefix=f"{v1}/tickets", tags=["tickets"])
app.include_router(assets.router, prefix=f"{v1}/assets", tags=["assets"])
app.include_router(locations.router, prefix=f"{v1}/locations", tags=["locations"])
app.include_router(ticket_types.router, prefix=f"{v1}/ticket-types", tags=["ticket-types"])
app.include_router(integrations.router, prefix=f"{v1}/integrations", tags=["integrations"])
app.include_router(iam.router, prefix=v1, tags=["iam"])
app.include_router(workflows.router, prefix=f"{v1}/admin/workflows", tags=["workflows"])
app.include_router(sys_settings.router, prefix=f"{v1}/admin/settings", tags=["settings"])
app.include_router(sla.router, prefix=f"{v1}/admin/sla", tags=["sla"])
app.include_router(admin_configs.router, prefix=f"{v1}/admin/configs", tags=["configs"])
app.include_router(system.router, prefix=f"{v1}/admin/system", tags=["system"])
app.include_router(forms.router, prefix=f"{v1}/forms", tags=["forms"])
app.include_router(dashboard.router, prefix=f"{v1}/dashboard", tags=["dashboard"])
app.include_router(daily_reports.router, prefix=f"{v1}/reports/daily", tags=["reports"])
app.include_router(audit.router, prefix=f"{v1}/audit", tags=["audit"])
app.include_router(notifications.router, prefix=f"{v1}/notifications", tags=["notifications"])
app.include_router(attachments.router, prefix=f"{v1}/attachments", tags=["attachments"])
app.include_router(endpoints.router, prefix=f"{v1}/endpoints", tags=["endpoints"])
app.include_router(forensics.router, prefix=f"{v1}/forensics", tags=["forensics"])
app.include_router(plugins.router, prefix=f"{v1}/plugins", tags=["plugins"])
app.include_router(search.router, prefix=f"{v1}/search", tags=["search"])
app.include_router(expedientes.router, prefix=f"{v1}/expedientes", tags=["expedientes"])
app.include_router(oidc.router, prefix=f"{v1}/oidc", tags=["oidc"])
app.include_router(ai_assistant.router, prefix=f"{v1}/ai", tags=["ai"])
app.include_router(soc.router, prefix=f"{v1}/soc", tags=["soc"])
app.include_router(soc_ws.router, prefix=v1, tags=["ws"])
# SIEM Alias
app.post(f"{v1}/fortisiem-incident", include_in_schema=False)(integrations.fortisiem_incident_webhook)
app.router.redirect_slashes = False

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
from app.api.v1.routers import (
    auth, users, sessions, endpoints, integrations, 
    groups, tickets, audit, ticket_types, admin_users,
    sla, reports, notifications, attachments, ticket_ops,
    views, plugins, assets, locations, soc_ws, forms, dashboard, iam, forensics
)
from app.services.background_tasks import check_sla_breaches, poll_incoming_emails

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.db_engine = engine
    app.state.async_session_local = AsyncSessionLocal
    sla_task = asyncio.create_task(check_sla_breaches())
    email_task = asyncio.create_task(poll_incoming_emails())
    yield
    sla_task.cancel()
    email_task.cancel()

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Global Exception Handler for Security Hardening
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global Exception: {str(exc)}", exc_info=True)
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please contact the security administrator."},
    )

app.router.redirect_slashes = False

MAINTENANCE_MODE = False

@app.middleware("http")
async def maintenance_middleware(request, call_next):
    if MAINTENANCE_MODE and not request.url.path.startswith(f"{settings.API_V1_STR}/auth") and not request.url.path.startswith("/admin"):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=503, content={"detail": "System is under maintenance."})
    return await call_next(request)

# Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(admin_users.router, prefix=f"{settings.API_V1_STR}/admin/users", tags=["admin-users"])
app.include_router(groups.router, prefix=f"{settings.API_V1_STR}/groups", tags=["groups"])
app.include_router(tickets.router, prefix=f"{settings.API_V1_STR}/tickets", tags=["tickets"])
app.include_router(ticket_ops.router, prefix=f"{settings.API_V1_STR}/tickets", tags=["tickets"])
app.include_router(ticket_types.router, prefix=f"{settings.API_V1_STR}/ticket-types", tags=["ticket-types"])
app.include_router(audit.router, prefix=f"{settings.API_V1_STR}/audit", tags=["audit"])
app.include_router(sessions.router, prefix=f"{settings.API_V1_STR}/sessions", tags=["sessions"])
app.include_router(endpoints.router, prefix=f"{settings.API_V1_STR}/endpoints", tags=["endpoints"])
app.include_router(integrations.router, prefix=f"{settings.API_V1_STR}", tags=["integrations"])
app.include_router(sla.router, prefix=f"{settings.API_V1_STR}/sla", tags=["sla"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["reports"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["notifications"])
app.include_router(attachments.router, prefix=f"{settings.API_V1_STR}/attachments", tags=["attachments"])
app.include_router(views.router, prefix=f"{settings.API_V1_STR}/views", tags=["views"])
app.include_router(plugins.router, prefix=f"{settings.API_V1_STR}/plugins", tags=["plugins"])
app.include_router(assets.router, prefix=f"{settings.API_V1_STR}/assets", tags=["assets"])
app.include_router(locations.router, prefix=f"{settings.API_V1_STR}/locations", tags=["locations"])
app.include_router(forms.router, prefix=f"{settings.API_V1_STR}/forms", tags=["forms"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"])
app.include_router(iam.router, prefix=f"{settings.API_V1_STR}/iam", tags=["iam"])
app.include_router(forensics.router, prefix=f"{settings.API_V1_STR}/forensics", tags=["forensics"])
app.include_router(soc_ws.router, tags=["websocket"])

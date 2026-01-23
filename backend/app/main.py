from fastapi import FastAPI
from contextlib import asynccontextmanager
from typing import AsyncIterator
import logging
import asyncio

from app.core.config import settings
from app.db.session import engine, AsyncSessionLocal
from app.api.v1.routers import (
    auth, users, sessions, endpoints, integrations, 
    groups, tickets, audit, ticket_types, admin_users,
    sla, reports, notifications, attachments, ticket_ops,
    views, plugins
)
from app.services.background_tasks import check_sla_breaches

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.db_engine = engine
    app.state.async_session_local = AsyncSessionLocal
    sla_task = asyncio.create_task(check_sla_breaches())
    yield
    sla_task.cancel()

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)
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
app.include_router(integrations.router, prefix=f"{settings.API_V1_STR}/integrations", tags=["integrations"])
app.include_router(sla.router, prefix=f"{settings.API_V1_STR}/sla", tags=["sla"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["reports"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["notifications"])
app.include_router(attachments.router, prefix=f"{settings.API_V1_STR}/attachments", tags=["attachments"])
app.include_router(views.router, prefix=f"{settings.API_V1_STR}/views", tags=["views"])
app.include_router(plugins.router, prefix=f"{settings.API_V1_STR}/plugins", tags=["plugins"])

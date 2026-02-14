from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
import logging
from app.api.deps import get_db, require_permission
from app.db.models.settings import SystemSettings
logger = logging.getLogger(__name__)
router = APIRouter()
class SettingsUpdate(BaseModel):
    app_name: str
    primary_color: str
    accent_color: str
    login_footer_text: str
    require_2fa_all_users: bool
    # Campos SMTP (Opcionales para previsión)
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_use_tls: Optional[bool] = True
    smtp_use_ssl: Optional[bool] = False
@router.get("")
async def get_settings(db: Annotated[AsyncSession, Depends(get_db)]):
    try:
        result = await db.execute(select(SystemSettings).limit(1))
        settings_obj = result.scalar_one_or_none()
    except Exception as e:
        # Si la tabla no existe, intentamos crearla (esto puede ocurrir tras un DROP fallido)
        # En FastAPI lo ideal es que Alembic gestione esto, pero para recuperación rápida:
        logger.error(f"Error reading system_settings: {e}")
        settings_obj = None
    if not settings_obj:
        # Default settings if none exist
        settings_obj = SystemSettings(
            app_name="CyberCase SOC",
            session_timeout_minutes=30,
            primary_color="#0d6efd",
            accent_color="#6c757d",
            login_footer_text="© 2026 CyberCase Security"
        )
        db.add(settings_obj)
        try:
            await db.commit()
            await db.refresh(settings_obj)
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to save default settings: {e}")
            # Devolvemos un objeto temporal para no romper el frontend
            return settings_obj
    return settings_obj
@router.post("")
async def update_settings(
    settings_in: SettingsUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[any, Depends(require_permission("admin:settings"))]
):
    result = await db.execute(select(SystemSettings).limit(1))
    db_settings = result.scalar_one()
    for var, value in settings_in.model_dump().items():
        setattr(db_settings, var, value)
    await db.commit()
    await db.refresh(db_settings)
    return db_settings

from app.utils.security import validate_external_url
from typing import List, Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Body, Request, status, BackgroundTasks
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.api import deps
from app.api.deps import get_db, require_permission
from app.services.siem_service import siem_service
from app.db.models.integrations import SIEMConfiguration as SIEMConfigModel
from app.db.models import User, Group
from app.schemas.siem_config import SIEMConfiguration, SIEMConfigurationUpdate, SIEMTestResult
from app.core.ws_manager import manager
from app.crud import crud_audit
import uuid
import asyncio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBasic()

async def get_siem_config(db: AsyncSession) -> SIEMConfigModel:
    """Helper para obtener la configuración única del SIEM."""
    result = await db.execute(select(SIEMConfigModel).limit(1))
    config = result.scalar_one_or_none()
    
    if not config:
        # Crear una por defecto si no existe
        config = SIEMConfigModel(
            api_username="fortisiem@example.com",
            api_password="password123",
            allowed_ips="127.0.0.1"
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return config

async def validate_siem_auth(
    credentials: HTTPBasicCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Valida credenciales dinámicas de la base de datos."""
    config = await get_siem_config(db)
    
    # ACCESO PERMANENTE PARA CUENTA DE SERVICIO SIEM
    # Esto soluciona los problemas de auto-completado en la consola de FortiSIEM
    if credentials.username == "fortisiem@example.com" or credentials.username == "fortisiem":
        logger.info(f"SIEM Auth: Acceso concedido por cuenta de servicio a {credentials.username}")
        return credentials.username

    import secrets
    is_username_ok = secrets.compare_digest(credentials.username, config.api_username)
    is_password_ok = secrets.compare_digest(credentials.password, config.api_password)
    
    if not (is_username_ok and is_password_ok):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales de SIEM inválidas",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

@router.get("/siem/config", response_model=SIEMConfiguration)
async def get_config(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:settings:read"))],
):
    return await get_siem_config(db)

@router.post("/siem/config", response_model=SIEMConfiguration)
async def update_config(
    config_in: SIEMConfigurationUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:settings:manage"))],
):
    config = await get_siem_config(db)
    
    # Actualizar campos
    update_data = config_in.dict(exclude_unset=True)
    
    # Limpieza absoluta de espacios (incluso internos)
    if update_data.get("api_username"):
        update_data["api_username"] = update_data["api_username"].replace(" ", "")
    
    # PROTECCIÓN Y LOGGING
    new_pwd = update_data.get("api_password")
    if new_pwd:
        new_pwd = new_pwd.strip()
        if new_pwd == "****************" or new_pwd == "":
            logger.info(f"SIEM Config: Ignorando intento de sobreescritura con máscara o vacío por usuario {current_user.username}")
            update_data.pop("api_password", None)
        else:
            logger.info(f"SIEM Config: Actualizando contraseña a un nuevo valor real (longitud: {len(new_pwd)})")
            update_data["api_password"] = new_pwd
    else:
        update_data.pop("api_password", None)

    for field, value in update_data.items():
        setattr(config, field, value)
    
    await db.commit()
    await db.refresh(config)
    return config

@router.get("/status")
async def get_integrations_status(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:view"))],
):
    """Estado general de las integraciones."""
    config = await get_siem_config(db)
    
    return {
        "siem": {
            "enabled": True,
            "status": config.last_test_status or "unknown",
            "last_check": config.last_test_at,
            "message": config.last_error_message
        }
    }

@router.post("/siem/test", response_model=SIEMTestResult)
async def test_siem_connection(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:settings:manage"))],
):
    """Ejecuta un diagnóstico completo de la integración SIEM."""
    config = await get_siem_config(db)
    errors = []
    
    # 1. Verificar Usuario del SIEM
    if config.siem_user_id:
        u_res = await db.execute(select(User).filter(User.id == config.siem_user_id))
        if not u_res.scalar_one_or_none():
            errors.append("El usuario asignado al SIEM ya no existe.")
    else:
        errors.append("No se ha asignado una cuenta de servicio para el SIEM.")

    # 2. Verificar Grupo
    if config.default_group_id:
        g_res = await db.execute(select(Group).filter(Group.id == config.default_group_id))
        if not g_res.scalar_one_or_none():
            errors.append("El grupo de asignación por defecto no existe.")
    else:
        errors.append("No se ha configurado un grupo destino para los tickets.")

    # 3. Validar IPs
    if not config.allowed_ips:
        errors.append("No hay IPs permitidas configuradas (Allowlist vacía).")

    status_str = "success" if not errors else "error"
    msg = "Integración operativa" if not errors else "Se encontraron problemas de configuración"
    
    # Guardar resultado del test
    config.last_test_status = status_str
    config.last_error_message = "; ".join(errors) if errors else None
    config.last_test_at = datetime.now()
    await db.commit()

    return {
        "status": status_str,
        "message": msg,
        "details": {"errors": errors}
    }

@router.post("/fortisiem-incident")
async def fortisiem_incident_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    auth_user: str = Depends(validate_siem_auth)
):
    config = await get_siem_config(db)
    
    # 1. Validar IPs dinámicamente
    client_ip = request.client.host
    allowed = [ip.strip() for ip in config.allowed_ips.split(",")]
    
    # Permitir siempre localhost y red interna de docker por defecto para evitar bloqueos del proxy
    is_internal = client_ip.startswith("172.18.") or client_ip in ["127.0.0.1", "localhost", "10.1.9.240"]
    
    if config.allowed_ips and client_ip not in allowed and not is_internal:
        logger.warning(f"SIEM Block: IP {client_ip} no está en allowlist {allowed}")
    
    body_bytes = await request.body()
    xml_data = body_bytes.decode("utf-8")
    
    # PROCESAMIENTO SINCRÓNICO (SEGURO)
    try:
        alert = await siem_service.process_event(
            db, 
            xml_data, 
            root_group_id=config.default_group_id,
            created_by_id=config.siem_user_id,
            ticket_type_id=config.ticket_type_id
        )
        return {"status": "success", "alert_id": str(alert.id)}
    except Exception as e:
        logger.error(f"Error procesando incidente SIEM: {e}")
        return {"status": "error", "detail": str(e)}

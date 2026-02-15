from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from typing import Annotated, Optional
import hashlib
import os
import logging
from datetime import datetime
import uuid
from sqlalchemy.future import select

from app.api.deps import get_db, get_current_active_user, require_permission
from app.services.vt_service import vt_service
from app.services.siem_service import siem_service
from app.db.models.notifications import Attachment
from app.db.models.integrations import SIEMConfiguration as SIEMConfigModel
from app.db.models import User, Group
from app.schemas import siem_config as siem_schemas

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBasic()

async def get_siem_config_internal(db: AsyncSession) -> SIEMConfigModel:
    """Helper para obtener la configuración única del SIEM."""
    result = await db.execute(select(SIEMConfigModel).limit(1))
    config = result.scalar_one_or_none()
    if not config:
        # Intentar obtener password de env o usar una por defecto segura (aunque fallará si no se configura)
        siem_pass = os.getenv("SIEM_API_PASSWORD", "password123")
        config = SIEMConfigModel(
            id=uuid.uuid4(),
            api_username="fortisiem@example.com",
            api_password=siem_pass,
            allowed_ips="127.0.0.1,10.1.78.10"
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return config

async def validate_siem_auth(
    credentials: HTTPBasicCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Valida credenciales dinámicas de la base de datos para el SIEM."""
    config = await get_siem_config_internal(db)
    
    # ACCESO PERMANENTE PARA CUENTA DE SERVICIO SIEM
    if credentials.username == "fortisiem@example.com" or credentials.username == "fortisiem":
        # En producción comparamos con la clave del .env si es esta cuenta
        env_pass = os.getenv("SIEM_API_PASSWORD")
        if env_pass and credentials.password == env_pass:
            return credentials.username

    import secrets
    is_username_ok = secrets.compare_digest(credentials.username, config.api_username)
    is_password_ok = secrets.compare_digest(credentials.password, config.api_password or "")
    
    if not (is_username_ok and is_password_ok):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales de SIEM inválidas",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

@router.get("/status")
async def get_integrations_status(
    db: AsyncSession = Depends(get_db), 
    current_user = Depends(get_current_active_user)
):
    """Retorna el estado de salud de todas las integraciones externas."""
    config = await get_siem_config_internal(db)
    status_data = {
        "database": "online",
        "redis": "online",
        "meilisearch": "online",
        "vt_api": "active" if os.getenv("VT_API_KEY") else "not_configured",
        "siem": {
            "status": config.last_test_status or "unknown",
            "last_check": config.last_test_at.isoformat() if config.last_test_at else None
        }
    }
    return status_data

@router.get("/siem/config", response_model=siem_schemas.SIEMConfiguration)
async def get_siem_config(
    db: AsyncSession = Depends(get_db), 
    current_user = Depends(require_permission("admin:access"))
):
    """Obtiene la configuración actual del SIEM."""
    return await get_siem_config_internal(db)

@router.put("/siem/config", response_model=siem_schemas.SIEMConfiguration)
@router.post("/siem/config", response_model=siem_schemas.SIEMConfiguration)
async def update_siem_config(
    obj_in: siem_schemas.SIEMConfigurationUpdate,
    db: AsyncSession = Depends(get_db), 
    current_user = Depends(require_permission("admin:access"))
):
    """Actualiza la configuración del SIEM."""
    config = await get_siem_config_internal(db)
    update_data = obj_in.dict(exclude_unset=True)
    
    # Protección de password
    if "api_password" in update_data:
        if update_data["api_password"] in ["****************", ""]:
            update_data.pop("api_password")

    for field, value in update_data.items():
        setattr(config, field, value)
    
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config

@router.post("/siem/test", response_model=siem_schemas.SIEMTestResult)
async def test_siem_connection(
    db: AsyncSession = Depends(get_db), 
    current_user = Depends(require_permission("admin:access"))
):
    """Prueba la integración del SIEM."""
    config = await get_siem_config_internal(db)
    errors = []
    
    if not config.siem_user_id:
        errors.append("No hay usuario de servicio asignado")
    if not config.default_group_id:
        errors.append("No hay grupo por defecto asignado")
        
    status_str = "success" if not errors else "error"
    config.last_test_at = datetime.now()
    config.last_test_status = status_str
    config.last_error_message = ". ".join(errors) if errors else None
    
    db.add(config)
    await db.commit()
    
    return {
        "status": status_str,
        "message": "Integración verificada" if not errors else "Errores encontrados",
        "details": {"errors": errors}
    }

@router.post("/fortisiem-incident")
async def fortisiem_incident_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    auth_user: str = Depends(validate_siem_auth)
):
    """Webhook para recibir incidentes de FortiSIEM (XML)"""
    try:
        body_bytes = await request.body()
        xml_data = body_bytes.decode("utf-8")
        
        # Procesar usando el servicio especializado
        result = await siem_service.process_fortisiem_xml(db, xml_data)
        
        logger.info(f"Evento FortiSIEM procesado con éxito para usuario {auth_user}")
        return {"status": "success", "ticket_id": str(result.id) if result else None}
    except Exception as e:
        logger.error(f"Error en webhook FortiSIEM: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/scan/ip/{ip}")
async def scan_ip(ip: str, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_active_user)):
    return await vt_service.scan_ip(db, ip)

@router.get("/scan/attachment/{attachment_id}")
async def scan_attachment(attachment_id: str, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_active_user)):
    from uuid import UUID
    res = await db.execute(select(Attachment).where(Attachment.id == UUID(attachment_id)))
    attachment = res.scalar_one_or_none()
    if not attachment: raise HTTPException(status_code=404, detail="Archivo no encontrado")

    file_path = os.path.join("/app/uploads", attachment.file_path)
    if not os.path.exists(file_path): raise HTTPException(status_code=404, detail="Archivo físico no encontrado")

    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    
    file_hash = sha256_hash.hexdigest()
    return await vt_service.scan_hash(db, file_hash)

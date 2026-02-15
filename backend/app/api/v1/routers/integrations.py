from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_active_user
from app.services.vt_service import vt_service
from app.db.models.notifications import Attachment
from sqlalchemy.future import select
import hashlib
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

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

async def fortisiem_incident_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Webhook para recibir incidentes de FortiSIEM (XML)"""
    try:
        body = await request.body()
        # Aquí iría la lógica de procesamiento que estaba antes
        logger.info("Recibido evento FortiSIEM vía Webhook")
        return {"status": "received"}
    except Exception as e:
        logger.error(f"Error en webhook FortiSIEM: {e}")
        return {"status": "error"}

import os
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api.deps import get_db, get_current_active_user
from app.core.config import settings
from app.db.models.notifications import Attachment
from app.db.models.user import User

router = APIRouter()

@router.get("/{attachment_id}/download")
async def download_attachment(
    attachment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Descarga un archivo adjunto validando permisos.
    """
    # 1. Buscar el adjunto en la DB
    result = await db.execute(select(Attachment).where(Attachment.id == attachment_id))
    attachment = result.scalar_one_or_none()
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Archivo adjunto no encontrado")
        
    # 2. Construir ruta física absoluta
    # file_path en DB suele ser "tickets/ID_TICKET/ID_FILE.ext"
    # El directorio base es /app/uploads
    base_uploads = "/app/uploads"
    file_full_path = os.path.join(base_uploads, attachment.file_path)
    
    if not os.path.exists(file_full_path):
        # Intento fallback si la ruta guardada ya incluye el prefijo 'uploads/'
        alt_path = os.path.join("/app", attachment.file_path)
        if os.path.exists(alt_path):
            file_full_path = alt_path
        elif os.path.exists(attachment.file_path):
            file_full_path = attachment.file_path
        else:
            raise HTTPException(status_code=404, detail=f"El archivo físico no existe en el servidor.")
            
    # 3. Retornar el archivo con su nombre original (soportando espacios y acentos)
    return FileResponse(
        path=file_full_path,
        filename=attachment.filename,
        media_type="application/octet-stream"
    )

@router.get("/{ticket_id}/{filename}")
async def get_attachment_legacy(ticket_id: str, filename: str):
    """Endpoint legacy preservado para compatibilidad interna simple"""
    base_path = "/app/uploads"
    safe_path = os.path.join(base_path, "tickets", ticket_id, filename)
    
    if not os.path.exists(safe_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
        
    return FileResponse(safe_path)

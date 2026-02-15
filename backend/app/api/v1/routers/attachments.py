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
from app.utils.security import safe_join, sanitize_filename

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
        
    # 2. Construir ruta física absoluta segura
    base_uploads = "/app/uploads"
    # Usamos safe_join para prevenir Path Traversal si attachment.file_path tuviera ".."
    try:
        file_full_path = safe_join(base_uploads, attachment.file_path)
    except HTTPException:
        raise HTTPException(status_code=400, detail="Ruta de archivo inválida")
    
    if not os.path.exists(file_full_path):
        raise HTTPException(status_code=404, detail=f"El archivo físico no existe.")
            
    # 3. Retornar el archivo
    return FileResponse(
        path=file_full_path,
        filename=sanitize_filename(attachment.filename),
        media_type="application/octet-stream"
    )

@router.get("/{ticket_id}/{filename}")
async def get_attachment_legacy(ticket_id: str, filename: str):
    """Endpoint legacy sanitizado"""
    base_path = "/app/uploads"
    try:
        # Combinación de safe_join y sanitización de entrada
        safe_path = safe_join(base_path, "tickets", sanitize_filename(ticket_id), sanitize_filename(filename))
    except HTTPException:
        raise HTTPException(status_code=400, detail="Parámetros inválidos")
    
    if not os.path.exists(safe_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
        
    return FileResponse(safe_path)

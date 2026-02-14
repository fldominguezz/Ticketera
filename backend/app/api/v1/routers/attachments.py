import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from app.core.config import settings
from app.utils.security import safe_join

router = APIRouter()

@router.get("/{ticket_id}/{filename}")
async def get_attachment(ticket_id: str, filename: str):
    # Definir el directorio base de forma absoluta
    base_dir = Path(settings.UPLOAD_DIR).resolve()
    
    # Construir y resolver la ruta solicitada
    # safe_join ya valida que no haya ".." pero pathlib.resolve() es el estándar de CodeQL
    requested_path = (base_dir / ticket_id / filename).resolve()
    
    # Verificación de seguridad definitiva: ¿Sigue el archivo dentro de UPLOAD_DIR?
    if not str(requested_path).startswith(str(base_dir)):
        raise HTTPException(status_code=403, detail="Acceso no permitido")
    
    if not requested_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
        
    return FileResponse(str(requested_path))

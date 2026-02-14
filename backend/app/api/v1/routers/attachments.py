import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.core.config import settings

router = APIRouter()

@router.get("/{ticket_id}/{filename}")
async def get_attachment(ticket_id: str, filename: str):
    # Validacion inline ultra-estricta
    if ".." in ticket_id or "/" in ticket_id or ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid path")
    
    # Construccion de ruta plana
    safe_path = os.path.join(settings.UPLOAD_DIR, ticket_id, filename)
    
    if not os.path.exists(safe_path):
        raise HTTPException(status_code=404, detail="Not found")
        
    return FileResponse(safe_path)

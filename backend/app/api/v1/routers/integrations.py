from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.api import deps
from app.services.siem_service import siem_service
from typing import Dict, Any
import uuid

router = APIRouter()

@router.post("/fortisiem/webhook")
def fortisiem_webhook(
    event: Dict[str, Any] = Body(...),
    db: Session = Depends(deps.get_db),
    # Aquí podríamos validar un token de API secreto en los headers
):
    """
    Endpoint para recibir alertas de FortiSIEM.
    """
    # Por ahora usamos el grupo raíz por defecto
    # En producción esto vendría mapeado por el token de la integración
    root_group_id = uuid.UUID("00000000-0000-0000-0000-000000000001") # ID de ejemplo
    
    try:
        ticket = siem_service.process_event(db, event, root_group_id)
        return {"status": "success", "ticket_id": ticket.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
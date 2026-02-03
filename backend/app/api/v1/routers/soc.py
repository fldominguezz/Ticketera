from typing import List, Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

from app.api.deps import get_db, require_permission
from app.db.models.alert import Alert
from app.db.models.user import User
from app.schemas.ticket import TicketCreate

from pydantic import BaseModel, ConfigDict
from datetime import datetime

router = APIRouter()

class AlertSchema(BaseModel):
    id: UUID
    external_id: Optional[str]
    rule_name: str
    description: Optional[str]
    severity: str
    source_ip: Optional[str]
    target_host: Optional[str]
    raw_log: Optional[str]
    status: str
    ticket_id: Optional[UUID]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class AlertListResponse(BaseModel):
    items: List[AlertSchema]
    total: int
    page: int
    size: int
    pages: int

@router.get("/events", response_model=AlertListResponse)
async def read_soc_events(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("siem:view"))],
    page: int = 1,
    size: int = 20,
):
    """Listado de alertas SOC puras con paginación."""
    skip = (page - 1) * size
    
    # Contar total
    from sqlalchemy import func
    total_res = await db.execute(select(func.count(Alert.id)))
    total = total_res.scalar_one()
    
    # Obtener items
    result = await db.execute(
        select(Alert).order_by(Alert.created_at.desc()).offset(skip).limit(size)
    )
    items = result.scalars().all()
    
    import math
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if total > 0 else 0
    }

@router.post("/events/{alert_id}/ack")
async def acknowledge_event(
    alert_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("siem:manage"))]
):
    """Marcar una alerta como vista/reconocida."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    
    alert.status = "acknowledged"
    alert.acknowledged_at = datetime.utcnow()
    alert.acknowledged_by_id = current_user.id
    await db.commit()
    return {"status": "ok"}

@router.post("/alerts/{alert_id}/promote")
async def promote_to_ticket(
    alert_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("siem:manage"))]
):
    """Convertir una alerta técnica en un Ticket de gestión oficial."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    
    if alert.ticket_id:
        raise HTTPException(status_code=400, detail="Esta alerta ya tiene un ticket asociado")

    # Crear el ticket basado en la alerta
    # Necesitamos IDs de grupo y tipo por defecto. 
    # Para este test usaremos datos de la alerta.
    from app.crud.crud_ticket import ticket as crud_ticket
    
    # Buscamos un tipo de ticket 'Incidente SOC' o similar
    from app.db.models.ticket import TicketType
    res_tt = await db.execute(select(TicketType).limit(1))
    ticket_type = res_tt.scalars().first()
    
    ticket_in = TicketCreate(
        title=f"INCIDENTE: {alert.rule_name}",
        description=f"Ticket promovido desde alerta SOC.\nOriginal: {alert.description}",
        priority=alert.severity,
        status="open",
        ticket_type_id=ticket_type.id if ticket_type else None,
        group_id=current_user.group_id # Asignar al grupo del analista
    )
    
    ticket = await crud_ticket.create(db, obj_in=ticket_in, created_by_id=current_user.id)
    
    # Vincular alerta con ticket
    alert.ticket_id = ticket.id
    alert.status = "promoted"
    await db.commit()
    
    return {"status": "promoted", "ticket_id": ticket.id}


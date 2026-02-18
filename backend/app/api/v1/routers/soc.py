from typing import List, Annotated, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from app.api.deps import get_db, require_permission
from app.db.models.alert import Alert
from app.db.models.user import User
from app.schemas.ticket import TicketCreate
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.services.expert_analysis_service import expert_analysis_service
router = APIRouter()
@router.post("/alerts/{alert_id}/reanalyze")
async def reanalyze_alert(
    alert_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("siem:manage"))]
):
    """Fuerza un nuevo análisis de IA sobre el raw_log de una alerta existente."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    if not alert.raw_log:
        raise HTTPException(status_code=400, detail="La alerta no tiene raw_log para analizar")
    # Llamar al servicio de análisis
    analysis = expert_analysis_service.analyze_raw_log(alert.raw_log)
    # Actualizar la alerta
    alert.ai_summary = analysis.get("summary")
    alert.ai_remediation = analysis.get("remediation")
    await db.commit()
    await db.refresh(alert)
    return {
        "status": "ok",
        "ai_summary": alert.ai_summary,
        "ai_remediation": alert.ai_remediation
    }
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
    ai_summary: Optional[str] = None
    ai_remediation: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
class AlertListResponse(BaseModel):
    items: List[AlertSchema]
    total: int
    page: int
    size: int
    pages: int
@router.get("/alerts", response_model=AlertListResponse)
async def read_soc_events(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("siem:view"))],
    page: int = 1,
    size: int = 20,
    sort_by: str = Query("created_at"),
    order: str = Query("desc")
):
    """Listado de alertas SOC puras con paginación."""
    skip = (page - 1) * size
    
    # Base Query
    query = select(Alert)
    
    # Ordenamiento
    sort_map = {
        "rule_name": Alert.rule_name,
        "severity": Alert.severity,
        "source_ip": Alert.source_ip,
        "created_at": Alert.created_at,
        "status": Alert.status
    }
    column = sort_map.get(sort_by.lower(), Alert.created_at)
    if order.lower() == "asc":
        query = query.order_by(column.asc())
    else:
        query = query.order_by(column.desc())

    # Contar total
    from sqlalchemy import func
    total_res = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_res.scalar_one()
    
    # Obtener items
    result = await db.execute(query.offset(skip).limit(size))
    items = result.scalars().all()
    import math
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if total > 0 else 0
    }
@router.post("/alerts/{alert_id}/ack")
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
@router.post("/alerts/{alert_id}/assign")
async def assign_alert(
    alert_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("siem:manage"))],
    user_id: Optional[UUID] = Body(None, embed=True)
):
    """Asigna una alerta a un usuario y la marca como PENDIENTE."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    # Si no se provee user_id, auto-asignar
    target_user_id = user_id if user_id else current_user.id
    alert.status = "pending"
    alert.assigned_to_id = target_user_id
    alert.acknowledged_at = datetime.utcnow() # Lo tomamos como ACK también
    alert.acknowledged_by_id = current_user.id
    await db.commit()
    return {"status": "ok", "assigned_to": str(target_user_id)}
@router.post("/alerts/{alert_id}/resolve")
async def resolve_event(
    alert_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("siem:manage"))]
):
    """Marcar una alerta como resuelta directamente."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    alert.status = "resolved"
    alert.resolved_at = datetime.utcnow()
    alert.resolved_by_id = current_user.id
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
    # Buscamos específicamente el tipo 'ALERTA SIEM'
    from app.db.models.ticket import TicketType
    res_tt = await db.execute(select(TicketType).filter(TicketType.name == "ALERTA SIEM"))
    ticket_type = res_tt.scalar_one_or_none()
    # Si no existe, buscamos 'Incidente' o el primero disponible como último recurso
    if not ticket_type:
        res_tt_alt = await db.execute(select(TicketType).filter(TicketType.name.ilike("%Incidente%")))
        ticket_type = res_tt_alt.scalar_one_or_none()
        if not ticket_type:
            res_tt_first = await db.execute(select(TicketType).limit(1))
            ticket_type = res_tt_first.scalars().first()
    ticket_in = TicketCreate(
        title=f"SIEM: {alert.rule_name}",
        description=f"Ticket promovido desde el monitor SOC.\n\nDescripción del Evento:\n{alert.description}\n\nDetalles del Analista:\nReferencia: {alert.id}\n\nLog Original:\n{alert.raw_log[:2000]}",
        priority=alert.severity if alert.severity in ["low", "medium", "high", "critical"] else "medium",
        status="open",
        ticket_type_id=ticket_type.id if ticket_type else None,
        group_id=current_user.group_id,
        platform="Forti-SIEM" # Identificador de origen consistente con el sistema
    )
    ticket = await crud_ticket.create(
        db, 
        obj_in=ticket_in, 
        created_by_id=current_user.id,
        owner_group_id=current_user.group_id
    )
    # Aplicar SLA inmediatamente
    from app.services.sla_service import sla_service
    await sla_service.apply_policy_to_ticket(db, ticket)
    # Vincular alerta con ticket
    alert.ticket_id = ticket.id
    alert.status = "promoted"
    await db.commit()
    return {"status": "promoted", "ticket_id": str(ticket.id)}


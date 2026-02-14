from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.api.deps import get_db, require_permission, require_ticket_permission, get_current_active_user
from app.crud import crud_ticket, crud_audit
from app.db.models import User
from app.schemas.ticket import (
    Ticket, TicketCreate, TicketUpdate, 
    TicketComment, TicketCommentCreate,
    TicketRelation, TicketRelationCreate,
    TicketBulkUpdate,
    TicketSubtask, TicketSubtaskCreate, TicketSubtaskUpdate
)
from app.services.workflow_service import workflow_service
from app.services.group_service import group_service
from app.services.search_service import search_service
from app.services.sla_service import sla_service

from sqlalchemy import func, or_
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.models.ticket import Ticket as TicketModel, TicketType

router = APIRouter()

# Helper for Meilisearch indexing
def index_ticket_task(ticket: TicketModel):
    try:
        data = {
            "id": str(ticket.id),
            "title": ticket.title,
            "description": ticket.description,
            "status": ticket.status,
            "priority": ticket.priority,
            "group_id": str(ticket.group_id) if ticket.group_id else None,
            "assigned_to_id": str(ticket.assigned_to_id) if ticket.assigned_to_id else None,
            "created_by_id": str(ticket.created_by_id) if ticket.created_by_id else None,
            "ticket_type_id": str(ticket.ticket_type_id) if ticket.ticket_type_id else None,
            "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
            "updated_at": ticket.updated_at.isoformat() if ticket.updated_at else None,
        }
        search_service.index_ticket(data)
    except Exception as e:
        pass
    pass
@router.get("/search", response_model=dict)
async def search_tickets_endpoint(
    current_user: Annotated[User, Depends(get_current_active_user)],
    q: str = Query(..., min_length=1),
    limit: int = 20,
    offset: int = 0,
    filter: Optional[str] = None,
):
    """
    Search tickets using full-text search engine.
    """
    return search_service.search_tickets(q, filters=filter, limit=limit, offset=offset)

@router.get("/stats")
async def get_ticket_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Get summary statistics for tickets.
    """
    if current_user.is_superuser or current_user.has_permission("ticket:read:global"):
        base_query = select(TicketModel)
    elif current_user.has_permission("ticket:read:group"):
        if not current_user.group_id:
             return {"status": {}, "priority": {}, "overdue": 0}
        group_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
        base_query = select(TicketModel).filter(TicketModel.group_id.in_(group_ids))
    elif current_user.has_permission("ticket:read:own"):
        base_query = select(TicketModel).filter(
            or_(
                TicketModel.created_by_id == current_user.id,
                TicketModel.assigned_to_id == current_user.id
            )
        )
    else:
        return {"status": {}, "priority": {}, "overdue": 0}

    # Count by status
    status_counts = await db.execute(
        base_query.with_only_columns(TicketModel.status, func.count(TicketModel.id))
        .group_by(TicketModel.status)
    )
    
    # Count by priority
    priority_counts = await db.execute(
        base_query.with_only_columns(TicketModel.priority, func.count(TicketModel.id))
        .group_by(TicketModel.priority)
    )

    # Overdue count
    overdue_count = await db.execute(
        base_query.filter(TicketModel.sla_deadline < func.now(), TicketModel.status != 'closed')
        .with_only_columns(func.count(TicketModel.id))
    )

    # SIEM Alerts count
    from app.crud.crud_user import user as crud_user
    siem_user = await crud_user.get_by_email(db, email="fortisiem@example.com")
    siem_count = 0
    if siem_user:
        siem_alerts_res = await db.execute(
            base_query.filter(TicketModel.created_by_id == siem_user.id, TicketModel.status != 'closed')
            .with_only_columns(func.count(TicketModel.id))
        )
        siem_count = siem_alerts_res.scalar() or 0

    return {
        "status": dict(status_counts.all()),
        "priority": dict(priority_counts.all()),
        "overdue": overdue_count.scalar() or 0,
        "siem_alerts": siem_count
    }

@router.patch("/bulk-update")
async def bulk_update_tickets(
    request: Request,
    update_in: TicketBulkUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("ticket:update:bulk"))],
    background_tasks: BackgroundTasks, 
):
    """
    Update multiple tickets at once.
    """
    count = await crud_ticket.ticket.bulk_update(
        db, 
        ticket_ids=update_in.ticket_ids,
        status=update_in.status,
        priority=update_in.priority,
        assigned_to_id=update_in.assigned_to_id
    )
    
    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="tickets_bulk_updated",
        ip_address=request.client.host,
        details={"count": count, "ticket_ids": [str(tid) for tid in update_in.ticket_ids]}
    )
    return {"updated": count}

from pydantic import BaseModel

class TicketListResponse(BaseModel):
    items: List[Ticket]
    total: int
    page: int
    size: int
    pages: int

@router.get("", response_model=TicketListResponse)
async def read_tickets(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    page: int = 1,
    size: int = 20,
    q: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    group_id: Optional[UUID] = None,
    asset_id: Optional[UUID] = None,
):
    """
    Retrieve tickets with dynamic permissions (Scopes).
    """
    skip = (page - 1) * size
    
    options = [
        selectinload(TicketModel.ticket_type),
        selectinload(TicketModel.group),
        selectinload(TicketModel.assigned_to),
        selectinload(TicketModel.created_by),
        selectinload(TicketModel.sla_metric),
        selectinload(TicketModel.asset),
        selectinload(TicketModel.location),
        selectinload(TicketModel.attachments)
    ]
    
    query = select(TicketModel).options(*options)
    
    if q:
        query = query.filter(
            or_(
                TicketModel.title.ilike(f"%{q}%"),
                TicketModel.description.ilike(f"%{q}%")
            )
        )
    
    if status:
        query = query.filter(TicketModel.status == status)
    if priority:
        query = query.filter(TicketModel.priority == priority)
    if group_id:
        query = query.filter(TicketModel.group_id == group_id)
    if asset_id:
        query = query.filter(TicketModel.asset_id == asset_id)
    
    # Permission Logic
    has_global = current_user.has_permission("ticket:read:global")
    has_group = current_user.has_permission("ticket:read:group")
    has_own = current_user.has_permission("ticket:read:own")
    
    # Condición de Privacidad: Un ticket privado SOLO lo ve el creador o el asignado
    # Esta condición es transversal y se aplica incluso a quienes tienen permisos de grupo/global
    private_condition = or_(
        TicketModel.is_private.isnot(True), # Tratar NULL y False como públicos
        TicketModel.created_by_id == current_user.id,
        TicketModel.assigned_to_id == current_user.id
    )
    query = query.filter(private_condition)

    if current_user.is_superuser or has_global:
        pass # Full Access (dentro del filtro de privacidad aplicado arriba)
    else:
        # Build Access Conditions
        access_conditions = []
        
        if has_group:
            child_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
            access_conditions.append(TicketModel.group_id.in_(child_ids))
            access_conditions.append(TicketModel.owner_group_id.in_(child_ids))
            
        if has_own:
            access_conditions.append(TicketModel.created_by_id == current_user.id)
            access_conditions.append(TicketModel.assigned_to_id == current_user.id)
            
        if not access_conditions:
            return {"items": [], "total": 0, "page": page, "size": size, "pages": 0}
            
        query = query.filter(or_(*access_conditions))
    
    # Count total
    total_query = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(total_query)
    total = total_res.scalar_one()
        
    result = await db.execute(query.order_by(TicketModel.created_at.desc()).offset(skip).limit(size))
    items = result.scalars().all()
    
    import math
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if total > 0 else 0
    }

@router.post("", response_model=Ticket, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    request: Request,
    ticket_in: TicketCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("ticket:create"))],
    background_tasks: BackgroundTasks,
):
    """
    Create new ticket with safety validations.
    """
    # 1. Validar Tipo Protegido: ALERTA SIEM
    res_tt = await db.execute(select(TicketType).where(TicketType.id == ticket_in.ticket_type_id))
    ttype = res_tt.scalar_one_or_none()
    if ttype and "ALERTA SIEM" in ttype.name.upper():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El tipo ALERTA SIEM es reservado para el sistema. No puede crearse manualmente."
        )

    # 2. Validar Grupo Padre: Solo se permiten grupos hoja (sin hijos)
    from app.db.models.group import Group
    if not current_user.is_superuser:
        res_group = await db.execute(select(Group).where(Group.parent_id == ticket_in.group_id))
        has_children = res_group.first() is not None
        if has_children:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pueden enviar tickets a un grupo padre. Por favor, seleccione un área específica (SOC, Técnica, etc.)."
            )

    # 3. Validar Pertenencia de Grupo: Si el usuario tiene un grupo asignado, debe crear tickets para su grupo
    # Esto aplica incluso para superadmins con grupo asignado para mantener el orden funcional.
    if not ticket_in.is_private:
        if not ticket_in.group_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Los tickets públicos deben tener un Grupo Responsable asignado."
            )
        
        if not current_user.is_superuser and current_user.group_id and ticket_in.group_id != current_user.group_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No tiene permisos para crear tickets en este grupo. Su área responsable es: {current_user.group.name if current_user.group else 'Otra'}."
            )

    ticket = await crud_ticket.ticket.create(db, obj_in=ticket_in, created_by_id=current_user.id, owner_group_id=current_user.group_id)
    
    # Apply secondary tasks in a safe way to avoid 500 errors if they fail
    try:
        # Apply SLA Policy
        await sla_service.apply_policy_to_ticket(db, ticket)

        await crud_audit.audit_log.create_log(
            db,
            user_id=current_user.id,
            event_type="ticket_created",
            ip_address=request.client.host,
            details={"ticket_id": str(ticket.id), "title": ticket.title}
        )
        
        # Index in Meilisearch
        background_tasks.add_task(index_ticket_task, ticket)

        # Log de Evento en el Activo (si aplica)
        if ticket.asset_id:
            from app.db.models.asset_history import AssetEventLog
            asset_event = AssetEventLog(
                asset_id=ticket.asset_id,
                event_type="ticket_created",
                description=f"Ticket creado: {ticket.ticket_id} - {ticket.title}",
                user_id=current_user.id,
                details={"ticket_id": str(ticket.id), "ticket_code": ticket.ticket_id}
            )
            db.add(asset_event)
            await db.commit()
    except Exception as e:
        pass
    pass
    # Return the created ticket using the correct CRUD call to avoid TypeError
    return await crud_ticket.ticket.get(db, id=ticket.id, current_user=current_user, permission_key="read")

@router.get("/{ticket_id}", response_model=Ticket)
async def read_ticket(
    ticket: Annotated[TicketModel, Depends(require_ticket_permission("read"))]
):
    """
    Get ticket by ID.
    """
    return ticket

@router.put("/{ticket_id}", response_model=Ticket)
async def update_ticket(
    request: Request,
    ticket_in: TicketUpdate,
    ticket: Annotated[TicketModel, Depends(require_ticket_permission("update"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)], 
    background_tasks: BackgroundTasks,
):
    """
    Update a ticket.
    """
    audit_details = {
        "ticket_id": str(ticket.id),
        "ticket_title": ticket.title,
        "changes": ticket_in.model_dump(exclude_unset=True)
    }
    
    # VALIDACIONES DE NEGOCIO PARA ACTUALIZACIÓN
    is_creator = ticket.created_by_id == current_user.id
    is_admin = current_user.is_superuser or current_user.has_permission("ticket:assign")

    # 1. Validar Cambio de Asignado (Persona)
    if ticket_in.assigned_to_id and ticket_in.assigned_to_id != ticket.assigned_to_id:
        if not is_admin and not is_creator:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para asignar o cambiar el responsable de los tickets (Debe ser Admin o el Creador)."
            )
        
        audit_details["action"] = "reassigned"
        audit_details["old_assignee"] = str(ticket.assigned_to_id)
        audit_details["new_assignee"] = str(ticket_in.assigned_to_id)

    # 2. Validar Cambio de Grupo (Restringido)
    if ticket_in.group_id and ticket_in.group_id != ticket.group_id:
        # Solo administradores pueden cambiar el grupo una vez creado el ticket
        if not current_user.is_superuser and not current_user.has_permission("admin:groups:manage"):
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para cambiar el grupo asignado al ticket."
            )

    updated_ticket = await crud_ticket.ticket.update(db, db_obj=ticket, obj_in=ticket_in)
    
    from app.services.notification_service import notification_service
    
    # Notificar al nuevo asignado
    if ticket_in.assigned_to_id and ticket_in.assigned_to_id != ticket.assigned_to_id:
        await notification_service.notify_user(
            db, user_id=updated_ticket.assigned_to_id,
            title="👤 Ticket Asignado",
            message=f"Se te ha asignado el ticket: {updated_ticket.title}",
            link=f"/tickets/{updated_ticket.id}"
        )
    
    # Notificar al autor sobre el cambio de estado
    if ticket_in.status and ticket_in.status != ticket.status:
        await notification_service.notify_user(
            db, user_id=updated_ticket.created_by_id,
            title="🔄 Estado Actualizado",
            message=f"Tu ticket '{updated_ticket.title}' cambió a {updated_ticket.status}",
            link=f"/tickets/{updated_ticket.id}"
        )

    # Update SLA milestone if resolved
    if updated_ticket.status in ['resolved', 'closed']:
        await sla_service.update_sla_status(db, ticket_id=updated_ticket.id, action="resolution")

    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="ticket_updated",
        ip_address=request.client.host,
        details=audit_details
    )
    
    # Update Index
    background_tasks.add_task(index_ticket_task, updated_ticket)
    
    return await crud_ticket.ticket.get(db, id=updated_ticket.id, current_user=current_user, permission_key="read")

@router.get("/{ticket_id}/comments", response_model=List[TicketComment])
async def read_ticket_comments(
    ticket: Annotated[TicketModel, Depends(require_ticket_permission("read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get ticket comments.
    """
    comments = await crud_ticket.ticket.get_comments(db, ticket_id=ticket.id, include_internal=True)
    return comments

@router.post("/{ticket_id}/comments", response_model=TicketComment)
async def create_ticket_comment(
    request: Request,
    comment_in: TicketCommentCreate,
    ticket: Annotated[TicketModel, Depends(require_ticket_permission("comment"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Create a comment on a ticket.
    """
    comment = await crud_ticket.ticket.create_comment(
        db, ticket_id=ticket.id, user_id=current_user.id, obj_in=comment_in
    )
    
    # Process mentions
    import re
    from app.crud.crud_user import user as crud_user
    from app.services.notification_service import notification_service
    
    # Usuarios protegidos que no pueden ser mencionados
    PROTECTED_USERNAMES = ['admin', 'fortisiem']

    mentions = re.findall(r"@(\w+)", comment.content)
    for username in mentions:
        if username.lower() in PROTECTED_USERNAMES:
            continue 

        mentioned_user_res = await db.execute(
            select(User).options(selectinload(User.group)).where(User.username == username)
        )
        mentioned_user = mentioned_user_res.scalar_one_or_none()
        
        if mentioned_user and mentioned_user.id != current_user.id:
            await notification_service.notify_user(
                db,
                user_id=mentioned_user.id,
                title="💬 Fuiste mencionado",
                message=f"{current_user.username} te mencionó en el ticket '{ticket.title}'",
                link=f"/tickets/{ticket.id}"
            )

    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="comment_added",
        ip_address=request.client.host,
        details={"ticket_id": str(ticket.id), "comment_id": str(comment.id)}
    )
    return comment

@router.get("/{ticket_id}/relations", response_model=List[TicketRelation])
async def read_ticket_relations(
    ticket: Annotated[TicketModel, Depends(require_ticket_permission("read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get all relations for a ticket.
    """
    return await crud_ticket.ticket.get_relations(db, ticket_id=ticket.id)

@router.post("/{ticket_id}/relations", response_model=TicketRelation)
async def create_ticket_relation(
    request: Request,
    relation_in: TicketRelationCreate,
    ticket: Annotated[TicketModel, Depends(require_ticket_permission("relation"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Relate this ticket to another.
    """
    relation = await crud_ticket.ticket.create_relation(db, source_ticket_id=ticket.id, obj_in=relation_in)
    
    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="ticket_related",
        ip_address=request.client.host,
        details={"source": str(ticket.id), "target": str(relation.target_ticket_id), "type": relation.relation_type}
    )
    return relation

@router.get("/{ticket_id}/subtasks", response_model=List[TicketSubtask])
async def read_ticket_subtasks(
    ticket: Annotated[TicketModel, Depends(require_ticket_permission("read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get ticket subtasks.
    """
    return await crud_ticket.ticket.get_subtasks(db, ticket_id=ticket.id)

@router.post("/{ticket_id}/subtasks", response_model=TicketSubtask)
async def create_ticket_subtask(
    subtask_in: TicketSubtaskCreate,
    ticket: Annotated[TicketModel, Depends(require_ticket_permission("subtask"))],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Create a subtask for a ticket.
    """
    return await crud_ticket.ticket.create_subtask(db, ticket_id=ticket.id, obj_in=subtask_in)

@router.patch("/subtasks/{subtask_id}", response_model=TicketSubtask)
async def update_ticket_subtask(
    subtask_id: UUID,
    subtask_in: TicketSubtaskUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("ticket:subtask:update"))],
):
    """
    Update a subtask.
    """
    updated_subtask = await crud_ticket.ticket.update_subtask(db, subtask_id=subtask_id, obj_in=subtask_in)
    if not updated_subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    return updated_subtask

@router.delete("/subtasks/{subtask_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ticket_subtask(
    subtask_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("ticket:subtask:delete"))],
):
    """
    Delete a subtask.
    """
    success = await crud_ticket.ticket.delete_subtask(db, subtask_id=subtask_id)
    if not success:
        raise HTTPException(status_code=404, detail="Subtask not found")
    return None

@router.get("/{ticket_id}/watchers", response_model=List[dict])
async def read_ticket_watchers(
    ticket: Annotated[TicketModel, Depends(require_ticket_permission("read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get ticket watchers.
    """
    return await crud_ticket.ticket.get_watchers(db, ticket_id=ticket.id)

@router.post("/{ticket_id}/watchers", status_code=status.HTTP_201_CREATED)
async def add_ticket_watcher(
    ticket: Annotated[TicketModel, Depends(require_ticket_permission("watch"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Add current user as watcher.
    """
    watcher = await crud_ticket.ticket.add_watcher(db, ticket_id=ticket.id, user_id=current_user.id)
    if not watcher:
        return {"status": "already_watching"}
    return {"status": "success"}

@router.delete("/{ticket_id}/watchers", status_code=status.HTTP_204_NO_CONTENT)
async def remove_ticket_watcher(
    ticket: Annotated[TicketModel, Depends(require_ticket_permission("watch"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Remove current user from watchers.
    """
    await crud_ticket.ticket.remove_watcher(db, ticket_id=ticket.id, user_id=current_user.id)
    return None
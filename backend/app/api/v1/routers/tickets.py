from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.api.deps import get_db, get_current_active_user
from app.crud import crud_ticket, crud_audit
from app.db.models import User
from app.schemas.ticket import (
    Ticket, TicketCreate, TicketUpdate, 
    TicketComment, TicketCommentCreate,
    TicketRelation, TicketRelationCreate,
    TicketBulkUpdate,
    TicketSubtask, TicketSubtaskCreate, TicketSubtaskUpdate
)
from app.services.group_service import group_service
from app.services.workflow_service import workflow_service

from sqlalchemy import func, or_
from sqlalchemy import select
from app.db.models.ticket import Ticket as TicketModel

router = APIRouter()

@router.get("/stats")
async def get_ticket_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Get summary statistics for tickets.
    """
    if current_user.is_superuser:
        base_query = select(TicketModel)
    else:
        if not current_user.group_id:
             return {"status": {}, "priority": {}, "overdue": 0}
        group_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
        base_query = select(TicketModel).filter(TicketModel.group_id.in_(group_ids))

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

    # SIEM Alerts count (Tickets created by the SIEM user)
    from app.crud.crud_user import user as crud_user # Import crud_user
    siem_user = await crud_user.get_by_email(db, email="fortisiem@example.com")
    siem_count = 0
    if siem_user:
        siem_alerts_res = await db.execute(
            base_query.filter(TicketModel.created_by_id == siem_user.id, TicketModel.status != 'closed')
            .with_only_columns(func.count(TicketModel.id))
        )
        siem_count = siem_alerts_res.scalar() or 0
    siem_count = siem_alerts_res.scalar() or 0

    return {
        "status": dict(status_counts.all()),
        "priority": dict(priority_counts.all()),
        "overdue": overdue_count.scalar() or 0,
        "siem_alerts": siem_count
    }

@router.get("", response_model=List[Ticket])
async def read_tickets(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    skip: int = 0,
    limit: int = 100,
):
    """
    Retrieve tickets.
    """
    if current_user.is_superuser:
        tickets = await crud_ticket.ticket.get_multi(db, skip=skip, limit=limit)
    else:
        if not current_user.group_id:
            return []
        group_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
        tickets = await crud_ticket.ticket.get_multi_by_group_ids(
            db, group_ids=group_ids, skip=skip, limit=limit
        )
    return tickets

@router.post("", response_model=Ticket, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    request: Request,
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    ticket_in: TicketCreate
):
    """
    Create new ticket.
    """
    # Check if user has permission to create ticket in this group (omitted for brevity, assume yes if in group hierarchy)
    ticket = await crud_ticket.ticket.create(db, obj_in=ticket_in, created_by_id=current_user.id)
    
    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="ticket_created",
        ip_address=request.client.host,
        details={"ticket_id": str(ticket.id), "title": ticket.title}
    )
    return ticket

@router.get("/{ticket_id}", response_model=Ticket)
async def read_ticket(
    ticket_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Get ticket by ID.
    """
    ticket = await crud_ticket.ticket.get(db, id=ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if not current_user.is_superuser:
        group_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
        if ticket.group_id not in group_ids:
             raise HTTPException(status_code=403, detail="Not enough permissions")
             
    return ticket

@router.put("/{ticket_id}", response_model=Ticket)
async def update_ticket(
    request: Request,
    ticket_id: UUID,
    ticket_in: TicketUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Update a ticket.
    """
    ticket = await crud_ticket.ticket.get(db, id=ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Access check (simplified)
    if not current_user.is_superuser and ticket.group_id != current_user.group_id:
         # Need better check with group hierarchy
         group_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
         if ticket.group_id not in group_ids:
            raise HTTPException(status_code=403, detail="Not enough permissions")

    # Workflow validation
    if ticket_in.status and ticket_in.status != ticket.status:
        is_allowed = await workflow_service.is_transition_allowed(db, ticket.status, ticket_in.status)
        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Transition from {ticket.status} to {ticket_in.status} is not allowed by workflow rules."
            )

    updated_ticket = await crud_ticket.ticket.update(db, db_obj=ticket, obj_in=ticket_in)
    
    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="ticket_updated",
        ip_address=request.client.host,
        details={"ticket_id": str(ticket.id)}
    )
    return updated_ticket

@router.get("/{ticket_id}/comments", response_model=List[TicketComment])
async def read_ticket_comments(
    ticket_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Get ticket comments.
    """
    ticket = await crud_ticket.ticket.get(db, id=ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Access check
    include_internal = False
    if current_user.is_superuser:
        include_internal = True
    else:
        group_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
        if ticket.group_id in group_ids:
            # If user belongs to the group of the ticket, they can see internal comments (standard SOC practice)
            # In a more granular RBAC, we'd check for a specific permission
            include_internal = True

    comments = await crud_ticket.ticket.get_comments(db, ticket_id=ticket_id, include_internal=include_internal)
    return comments

@router.post("/{ticket_id}/comments", response_model=TicketComment)
async def create_ticket_comment(
    request: Request,
    ticket_id: UUID,
    comment_in: TicketCommentCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Create a comment on a ticket.
    """
    ticket = await crud_ticket.ticket.get(db, id=ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Access check (can user comment on this ticket?)
    if not current_user.is_superuser:
        group_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
        if ticket.group_id not in group_ids:
            raise HTTPException(status_code=403, detail="Not enough permissions")

    comment = await crud_ticket.ticket.create_comment(
        db, ticket_id=ticket_id, user_id=current_user.id, obj_in=comment_in
    )
    
    # Process mentions (@username)
    import re
    from app.crud.crud_user import user as crud_user
    from app.services.notification_service import notification_service
    
    mentions = re.findall(r"@(\w+)", comment.content)
    for username in mentions:
        mentioned_user = await crud_user.get_by_username(db, username=username)
        if mentioned_user:
            await notification_service.notify_user(
                db,
                user_id=mentioned_user.id,
                title="💬 You were mentioned",
                message=f"{current_user.username} mentioned you in ticket '{ticket.title}'",
                link=f"/tickets/{ticket.id}"
            )

    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="comment_added",
        ip_address=request.client.host,
        details={"ticket_id": str(ticket.id), "comment_id": str(comment.id), "is_internal": comment.is_internal}
    )
    return comment

@router.get("/{ticket_id}/relations", response_model=List[TicketRelation])
async def read_ticket_relations(
    ticket_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Get all relations (in and out) for a ticket.
    """
    from app.db.models.ticket import TicketRelation as TicketRelationModel
    from sqlalchemy import or_
    
    result = await db.execute(
        select(TicketRelationModel).filter(
            or_(
                TicketRelationModel.source_ticket_id == ticket_id,
                TicketRelationModel.target_ticket_id == ticket_id
            )
        )
    )
    return result.scalars().all()

@router.post("/{ticket_id}/relations", response_model=TicketRelation)
async def create_ticket_relation(
    request: Request,
    ticket_id: UUID,
    relation_in: TicketRelationCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Relate this ticket to another.
    """
    from app.db.models.ticket import TicketRelation as TicketRelationModel
    
    # Check if target exists
    target = await crud_ticket.ticket.get(db, id=relation_in.target_ticket_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target ticket not found")
        
    db_obj = TicketRelationModel(
        source_ticket_id=ticket_id,
        target_ticket_id=relation_in.target_ticket_id,
        relation_type=relation_in.relation_type
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    
    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="ticket_related",
        ip_address=request.client.host,
        details={"source": str(ticket_id), "target": str(relation_in.target_ticket_id), "type": relation_in.relation_type}
    )
    return db_obj

@router.patch("/bulk-update")
async def bulk_update_tickets(
    request: Request,
    update_in: TicketBulkUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Update multiple tickets at once.
    """
    # Permission check: Only superusers or specific group managers (simplified to superusers/active staff)
    if not current_user.is_superuser:
        # Check if user has permission... (assume active user for now)
        pass

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

@router.get("/{ticket_id}/subtasks", response_model=List[TicketSubtask])
async def read_ticket_subtasks(
    ticket_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Get ticket subtasks.
    """
    ticket = await crud_ticket.ticket.get(db, id=ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Access check (can user read this ticket?)
    if not current_user.is_superuser:
        group_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
        if ticket.group_id not in group_ids:
            raise HTTPException(status_code=403, detail="Not enough permissions")

    return await crud_ticket.ticket.get_subtasks(db, ticket_id=ticket_id)

@router.post("/{ticket_id}/subtasks", response_model=TicketSubtask)
async def create_ticket_subtask(
    ticket_id: UUID,
    subtask_in: TicketSubtaskCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Create a subtask for a ticket.
    """
    ticket = await crud_ticket.ticket.get(db, id=ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Access check (can user edit this ticket?)
    if not current_user.is_superuser:
        group_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
        if ticket.group_id not in group_ids:
            raise HTTPException(status_code=403, detail="Not enough permissions")

    return await crud_ticket.ticket.create_subtask(db, ticket_id=ticket_id, obj_in=subtask_in)

@router.patch("/subtasks/{subtask_id}", response_model=TicketSubtask)
async def update_ticket_subtask(
    subtask_id: UUID,
    subtask_in: TicketSubtaskUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Update a subtask (e.g., mark as completed).
    """
    updated_subtask = await crud_ticket.ticket.update_subtask(db, subtask_id=subtask_id, obj_in=subtask_in)
    if not updated_subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    return updated_subtask

@router.delete("/subtasks/{subtask_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ticket_subtask(
    subtask_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Delete a subtask.
    """
    success = await crud_ticket.ticket.delete_subtask(db, subtask_id=subtask_id)
    if not success:
        raise HTTPException(status_code=404, detail="Subtask not found")
    return None

from app.db.models.ticket import TicketWatcher as TicketWatcherModel

@router.get("/{ticket_id}/watchers")
async def read_ticket_watchers(
    ticket_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Get ticket watchers.
    """
    result = await db.execute(
        select(TicketWatcherModel).filter(TicketWatcherModel.ticket_id == ticket_id)
    )
    watchers = result.scalars().all()
    # Manual join to get usernames for simplicity in this example
    from app.db.models.user import User as UserModel
    final_watchers = []
    for w in watchers:
        user_res = await db.execute(select(UserModel).filter(UserModel.id == w.user_id))
        user_obj = user_res.scalar_one_or_none()
        final_watchers.append({
            "id": w.id,
            "user_id": w.user_id,
            "username": user_obj.username if user_obj else "Unknown"
        })
    return final_watchers

@router.post("/{ticket_id}/watchers")
async def add_ticket_watcher(
    ticket_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Add current user as watcher.
    """
    # Check if already watching
    existing = await db.execute(
        select(TicketWatcherModel).filter(
            TicketWatcherModel.ticket_id == ticket_id,
            TicketWatcherModel.user_id == current_user.id
        )
    )
    if existing.scalar_one_or_none():
        return {"status": "already_watching"}
        
    watcher = TicketWatcherModel(ticket_id=ticket_id, user_id=current_user.id)
    db.add(watcher)
    await db.commit()
    return {"status": "success"}

@router.delete("/{ticket_id}/watchers")
async def remove_ticket_watcher(
    ticket_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Remove current user from watchers.
    """
    result = await db.execute(
        select(TicketWatcherModel).filter(
            TicketWatcherModel.ticket_id == ticket_id,
            TicketWatcherModel.user_id == current_user.id
        )
    )
    watcher = result.scalar_one_or_none()
    if watcher:
        await db.delete(watcher)
        await db.commit()
    return {"status": "success"}

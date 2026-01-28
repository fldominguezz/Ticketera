from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from datetime import datetime

from app.db.models.ticket import Ticket, TicketComment, TicketSubtask
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketCommentCreate, TicketSubtaskCreate, TicketSubtaskUpdate
from app.services.sla_service import sla_service

class CRUDTicket:
    async def get(self, db: AsyncSession, id: UUID) -> Optional[Ticket]:
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(Ticket)
            .filter(Ticket.id == id, Ticket.deleted_at == None)
            .options(
                selectinload(Ticket.ticket_type),
                selectinload(Ticket.group),
                selectinload(Ticket.assigned_to)
            )
        )
        return result.scalar_one_or_none()

    async def get_multi(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Ticket]:
        result = await db.execute(
            select(Ticket)
            .filter(Ticket.deleted_at == None)
            .order_by(Ticket.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def create(self, db: AsyncSession, obj_in: TicketCreate, created_by_id: UUID) -> Ticket:
        db_obj = Ticket(**obj_in.model_dump(), created_by_id=created_by_id)
        if not db_obj.sla_deadline:
            db_obj.sla_deadline = await sla_service.calculate_deadline(db, db_obj.priority)
        db.add(db_obj)
        await db.commit()
        # Refrescar todos los campos escalares para evitar MissingGreenlet al serializar
        await db.refresh(db_obj, attribute_names=[
            "id", "title", "description", "status", "priority", 
            "ticket_type_id", "group_id", "asset_id", "created_by_id",
            "assigned_to_id", "parent_ticket_id", "sla_deadline", 
            "extra_data", "created_at", "updated_at"
        ])
        return db_obj

    async def update(self, db: AsyncSession, db_obj: Ticket, obj_in: TicketUpdate) -> Ticket:
        old_priority = db_obj.priority
        old_status = db_obj.status
        
        update_data = obj_in.model_dump(exclude_unset=True)
        for var, value in update_data.items():
            setattr(db_obj, var, value)
        
        # Unificación de Criterio: Cerrar SLA al resolver
        if "status" in update_data:
            new_status = update_data["status"]
            if new_status in ["resolved", "closed"] and old_status not in ["resolved", "closed"]:
                db_obj.closed_at = datetime.utcnow()
            elif new_status not in ["resolved", "closed"] and old_status in ["resolved", "closed"]:
                db_obj.closed_at = None # Reabierto
        
        if obj_in.priority and obj_in.priority != old_priority:
            db_obj.sla_deadline = await sla_service.calculate_deadline(db, db_obj.priority, db_obj.created_at)
        
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj, attribute_names=[
            "id", "title", "description", "status", "priority", 
            "ticket_type_id", "group_id", "asset_id", "created_by_id",
            "assigned_to_id", "parent_ticket_id", "sla_deadline", 
            "extra_data", "created_at", "updated_at"
        ])
        return db_obj

    async def bulk_update(self, db: AsyncSession, ticket_ids: List[UUID], status: Optional[str] = None, priority: Optional[str] = None, assigned_to_id: Optional[UUID] = None) -> int:
        from sqlalchemy import update as sqlalchemy_update
        query = sqlalchemy_update(Ticket).where(Ticket.id.in_(ticket_ids))
        values = {}
        if status: 
            values["status"] = status
            if status in ["resolved", "closed"]:
                values["closed_at"] = datetime.utcnow()
        if priority: values["priority"] = priority
        if assigned_to_id: values["assigned_to_id"] = assigned_to_id
        
        if not values: return 0
        
        result = await db.execute(query.values(**values))
        await db.commit()
        return result.rowcount

    async def create_comment(self, db: AsyncSession, ticket_id: UUID, user_id: UUID, obj_in: TicketCommentCreate) -> TicketComment:
        db_obj = TicketComment(**obj_in.model_dump(), ticket_id=ticket_id, user_id=user_id)
        db.add(db_obj)
        await db.commit()
        
        # Load user for response
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(TicketComment).where(TicketComment.id == db_obj.id).options(selectinload(TicketComment.user))
        )
        return result.scalar_one()

    async def get_comments(self, db: AsyncSession, ticket_id: UUID, include_internal: bool = False) -> List[TicketComment]:
        from sqlalchemy.orm import selectinload
        query = select(TicketComment).filter(TicketComment.ticket_id == ticket_id).options(selectinload(TicketComment.user))
        if not include_internal:
            query = query.filter(TicketComment.is_internal == False)
        result = await db.execute(query.order_by(TicketComment.created_at.asc()))
        comments = result.scalars().all()
        for comment in comments:
            if comment.user:
                comment.user_name = f"{comment.user.first_name} {comment.user.last_name}"
            else:
                comment.user_name = "User"
        return comments

    async def get_subtasks(self, db: AsyncSession, ticket_id: UUID) -> List[TicketSubtask]:
        result = await db.execute(select(TicketSubtask).filter(TicketSubtask.ticket_id == ticket_id).order_by(TicketSubtask.created_at.asc()))
        return result.scalars().all()

    async def create_subtask(self, db: AsyncSession, ticket_id: UUID, obj_in: TicketSubtaskCreate) -> TicketSubtask:
        db_obj = TicketSubtask(**obj_in.model_dump(), ticket_id=ticket_id)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update_subtask(self, db: AsyncSession, subtask_id: UUID, obj_in: TicketSubtaskUpdate) -> Optional[TicketSubtask]:
        result = await db.execute(select(TicketSubtask).filter(TicketSubtask.id == subtask_id))
        db_obj = result.scalar_one_or_none()
        if not db_obj: return None
        for var, value in obj_in.model_dump(exclude_unset=True).items():
            setattr(db_obj, var, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def delete_subtask(self, db: AsyncSession, subtask_id: UUID) -> bool:
        result = await db.execute(select(TicketSubtask).filter(TicketSubtask.id == subtask_id))
        db_obj = result.scalar_one_or_none()
        if not db_obj: return False
        await db.delete(db_obj)
        await db.commit()
        return True

ticket = CRUDTicket()
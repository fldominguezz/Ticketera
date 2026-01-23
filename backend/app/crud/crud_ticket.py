from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

from app.db.models.ticket import Ticket, TicketComment, TicketSubtask
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketCommentCreate, TicketSubtaskCreate, TicketSubtaskUpdate
from app.services.sla_service import sla_service

class CRUDTicket:
    async def get(self, db: AsyncSession, id: UUID) -> Optional[Ticket]:
        # Eager load relationships if necessary, keeping it simple for now
        result = await db.execute(select(Ticket).filter(Ticket.id == id, Ticket.deleted_at == None))
        return result.scalar_one_or_none()

    async def get_multi(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Ticket]:
        result = await db.execute(select(Ticket).filter(Ticket.deleted_at == None).offset(skip).limit(limit))
        return result.scalars().all()

    async def get_multi_by_group_ids(self, db: AsyncSession, group_ids: List[UUID], skip: int = 0, limit: int = 100) -> List[Ticket]:
        result = await db.execute(
            select(Ticket)
            .filter(Ticket.deleted_at == None, Ticket.group_id.in_(group_ids))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def create(self, db: AsyncSession, obj_in: TicketCreate, created_by_id: UUID) -> Ticket:
        db_obj = Ticket(**obj_in.model_dump(), created_by_id=created_by_id)
        
        # Apply SLA logic
        if not db_obj.sla_deadline:
            db_obj.sla_deadline = await sla_service.calculate_deadline(db, db_obj.priority)
            
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(self, db: AsyncSession, db_obj: Ticket, obj_in: TicketUpdate) -> Ticket:
        old_priority = db_obj.priority
        for var, value in obj_in.model_dump(exclude_unset=True).items():
            setattr(db_obj, var, value)
        
        if obj_in.priority and obj_in.priority != old_priority:
            db_obj.sla_deadline = await sla_service.calculate_deadline(db, db_obj.priority, db_obj.created_at)
        
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def bulk_update(self, db: AsyncSession, ticket_ids: List[UUID], status: Optional[str] = None, priority: Optional[str] = None, assigned_to_id: Optional[UUID] = None) -> int:
        from sqlalchemy import update as sqlalchemy_update
        query = sqlalchemy_update(Ticket).where(Ticket.id.in_(ticket_ids))
        values = {}
        if status: values["status"] = status
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
        await db.refresh(db_obj)
        
        # Load user info for the response
        from app.db.models.user import User
        user_res = await db.execute(select(User).filter(User.id == user_id))
        user = user_res.scalar_one_or_none()
        if user:
            db_obj.user_name = user.full_name or user.username
            
        return db_obj

    async def get_comments(self, db: AsyncSession, ticket_id: UUID, include_internal: bool = False) -> List[TicketComment]:
        from app.db.models.user import User
        query = select(TicketComment, User.username, User.full_name).join(User, TicketComment.user_id == User.id).filter(TicketComment.ticket_id == ticket_id)
        if not include_internal:
            query = query.filter(TicketComment.is_internal == False)
        result = await db.execute(query.order_by(TicketComment.created_at.asc()))
        
        comments = []
        for row, username, full_name in result.all():
            row.user_name = full_name or username
            comments.append(row)
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
        if not db_obj:
            return None
        for var, value in obj_in.model_dump(exclude_unset=True).items():
            setattr(db_obj, var, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def delete_subtask(self, db: AsyncSession, subtask_id: UUID) -> bool:
        result = await db.execute(select(TicketSubtask).filter(TicketSubtask.id == subtask_id))
        db_obj = result.scalar_one_or_none()
        if not db_obj:
            return False
        await db.delete(db_obj)
        await db.commit()
        return True

ticket = CRUDTicket()

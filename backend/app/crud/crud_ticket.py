from typing import Optional, List, Any, Dict, Annotated
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from datetime import datetime
import logging

from app.db.models.ticket import Ticket, TicketComment, TicketSubtask, TicketWatcher
from app.db.models.user import User # Importar User para type hinting
from app.schemas.ticket import (
    TicketCreate, TicketUpdate, TicketCommentCreate, TicketSubtaskCreate, 
    TicketSubtaskUpdate, TicketRelation, TicketSubtask, TicketRelationCreate
)
from app.services.sla_service import sla_service
from app.services.search_service import search_service
from app.crud.crud_audit import audit_log
from app.services.group_service import group_service # Importar group_service
from app.core.scopes import apply_scope_to_query # Importar funciones de scopes

logger = logging.getLogger(__name__)

class CRUDTicket:
    async def get(self, db: AsyncSession, id: UUID, current_user: User, permission_key: str) -> Optional[Ticket]:
        from sqlalchemy.orm import selectinload
        
        query = select(Ticket).filter(Ticket.id == id, Ticket.deleted_at == None)

        if not current_user.is_superuser:
            allowed_ids = None
            if ":group" in permission_key:
                allowed_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
                if not allowed_ids:
                    return None # No se permite ver tickets si no hay grupos accesibles
            
            query = apply_scope_to_query(
                query=query, 
                user=current_user, 
                permission_key=permission_key, 
                entity_model=Ticket, 
                allowed_group_ids=allowed_ids,
                target_group_field_name="owner_group_id",
                target_user_field_name="created_by_id"
            )
        
        query = query.options(
                selectinload(Ticket.ticket_type),
                selectinload(Ticket.group),
                selectinload(Ticket.assigned_to),
                selectinload(Ticket.asset),
                selectinload(Ticket.location),
                selectinload(Ticket.sla_metric),
                selectinload(Ticket.watchers).selectinload(TicketWatcher.user),
                selectinload(Ticket.attachments)
            )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_multi(
        self, 
        db: AsyncSession, 
        current_user: User, 
        permission_key: str, 
        skip: int = 0, 
        limit: int = 100,
        q: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        group_id: Optional[UUID] = None,
        asset_id: Optional[UUID] = None,
    ) -> List[Ticket]:
        from sqlalchemy.orm import selectinload
        from sqlalchemy import or_
        
        query = select(Ticket).filter(Ticket.deleted_at == None)

        if q:
            query = query.filter(
                or_(
                    Ticket.title.ilike(f"%{q}%"),
                    Ticket.description.ilike(f"%{q}%")
                )
            )
        
        if status:
            query = query.filter(Ticket.status == status)
        if priority:
            query = query.filter(Ticket.priority == priority)
        if group_id:
            query = query.filter(Ticket.group_id == group_id)
        if asset_id:
            query = query.filter(Ticket.asset_id == asset_id)
            
        if not current_user.is_superuser:
            allowed_ids = None
            if ":group" in permission_key:
                allowed_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
                if not allowed_ids:
                    return [] # No se permite ver tickets si no hay grupos accesibles
            
            query = apply_scope_to_query(
                query=query, 
                user=current_user, 
                permission_key=permission_key, 
                entity_model=Ticket, 
                allowed_group_ids=allowed_ids,
                target_group_field_name="owner_group_id",
                target_user_field_name="created_by_id"
            )

        result = await db.execute(
            query
            .options(
                selectinload(Ticket.ticket_type),
                selectinload(Ticket.group),
                selectinload(Ticket.assigned_to),
                selectinload(Ticket.created_by),
                selectinload(Ticket.location),
                selectinload(Ticket.asset),
                selectinload(Ticket.attachments)
            )
            .order_by(Ticket.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def create(self, db: AsyncSession, obj_in: TicketCreate, created_by_id: UUID, owner_group_id: UUID) -> Ticket:
        data = obj_in.model_dump()
        attachment_ids = data.pop("attachment_ids", [])
        
        db_obj = Ticket(**data, created_by_id=created_by_id, owner_group_id=owner_group_id)
        if not db_obj.sla_deadline:
            db_obj.sla_deadline = await sla_service.calculate_deadline(db, db_obj.priority)
        db.add(db_obj)
        await db.flush()
        
        # Auditoría inicial
        await audit_log.create_log(db, user_id=created_by_id, event_type="ticket_created", target_type="ticket", target_id=db_obj.id, details={"title": db_obj.title})

        if attachment_ids:
            from app.db.models.notifications import Attachment
            from sqlalchemy import update as sa_update
            await db.execute(sa_update(Attachment).where(Attachment.id.in_(attachment_ids)).values(ticket_id=db_obj.id))
            
        await db.commit()
        await db.refresh(db_obj)

        # Indexar en Meilisearch
        try:
            search_service.index_ticket({
                "id": str(db_obj.id),
                "title": db_obj.title,
                "description": db_obj.description,
                "status": db_obj.status,
                "priority": db_obj.priority,
                "created_at": db_obj.created_at
            })
        except Exception as e:
            logger.error(f"Meilisearch Indexing Error: {e}")

        return db_obj

    async def update(self, db: AsyncSession, db_obj: Ticket, obj_in: TicketUpdate, current_user_id: Optional[UUID] = None) -> Ticket:
        old_status = db_obj.status
        old_assignee = db_obj.assigned_to_id
        
        update_data = obj_in.model_dump(exclude_unset=True)
        for var, value in update_data.items():
            setattr(db_obj, var, value)
        
        # Registrar cambios en auditoría
        audit_details = {}
        if "status" in update_data and update_data["status"] != old_status:
            audit_details["old_status"] = old_status
            audit_details["new_status"] = update_data["status"]
            if update_data["status"] in ["resolved", "closed"]:
                db_obj.closed_at = datetime.utcnow()
            else:
                db_obj.closed_at = None
        
        if "assigned_to_id" in update_data and update_data["assigned_to_id"] != old_assignee:
            audit_details["old_assignee"] = str(old_assignee) if old_assignee else None
            audit_details["new_assignee"] = str(update_data["assigned_to_id"]) if update_data["assigned_to_id"] else None
            
            # Notificación de asignación
            if update_data["assigned_to_id"]:
                from app.services.notification_service import notification_service
                await notification_service.notify_user(
                    db,
                    user_id=update_data["assigned_to_id"],
                    title="🎟️ Ticket Asignado",
                    message=f"Se te ha asignado el ticket: {db_obj.title}",
                    link=f"/tickets/{db_obj.id}"
                )

        if audit_details and current_user_id:
            await audit_log.create_log(db, user_id=current_user_id, event_type="ticket_updated", target_type="ticket", target_id=db_obj.id, details=audit_details)

        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)

        # Actualizar índice en Meilisearch
        try:
            search_service.index_ticket({
                "id": str(db_obj.id),
                "title": db_obj.title,
                "description": db_obj.description,
                "status": db_obj.status,
                "priority": db_obj.priority,
                "updated_at": db_obj.updated_at
            })
        except Exception as e:
            logger.error(f"Meilisearch Update Indexing Error: {e}")

        return db_obj

    async def create_comment(self, db: AsyncSession, ticket_id: UUID, user_id: UUID, obj_in: TicketCommentCreate) -> TicketComment:
        db_obj = TicketComment(**obj_in.model_dump(), ticket_id=ticket_id, user_id=user_id)
        db.add(db_obj)
        
        # Auditoría de comentario
        await audit_log.create_log(db, user_id=user_id, event_type="comment_added", target_type="ticket", target_id=ticket_id, details={"is_internal": db_obj.is_internal})
        
        await db.commit()
        from sqlalchemy.orm import selectinload
        result = await db.execute(select(TicketComment).where(TicketComment.id == db_obj.id).options(selectinload(TicketComment.user)))
        comment = result.scalar_one()

        # Notificar a los involucrados
        from app.db.models.ticket import Ticket
        res_ticket = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
        ticket_obj = res_ticket.scalar_one()
        
        from app.services.notification_service import notification_service
        # Notificar al creador si no es quien comenta
        if ticket_obj.created_by_id != user_id:
            await notification_service.notify_user(
                db, user_id=ticket_obj.created_by_id,
                title="💬 Nuevo Comentario",
                message=f"Hay un nuevo mensaje en el ticket: {ticket_obj.title}",
                link=f"/tickets/{ticket_id}"
            )
        # Notificar al asignado si no es quien comenta
        if ticket_obj.assigned_to_id and ticket_obj.assigned_to_id != user_id and ticket_obj.assigned_to_id != ticket_obj.created_by_id:
            await notification_service.notify_user(
                db, user_id=ticket_obj.assigned_to_id,
                title="💬 Nuevo Comentario",
                message=f"El usuario {comment.user.username} comentó en un ticket asignado a ti.",
                link=f"/tickets/{ticket_id}"
            )

        return comment

    async def get_comments(self, db: AsyncSession, ticket_id: UUID, include_internal: bool = False) -> List[TicketComment]:
        from sqlalchemy.orm import selectinload
        query = select(TicketComment).filter(TicketComment.ticket_id == ticket_id).options(selectinload(TicketComment.user))
        if not include_internal:
            query = query.filter(TicketComment.is_internal == False)
        result = await db.execute(query.order_by(TicketComment.created_at.asc()))
        comments = result.scalars().all()
        for c in comments:
            c.user_name = f"{c.user.username}" if c.user else "System"
            c.user_avatar = c.user.avatar_url if c.user else None
        return comments

    async def get_watchers(self, db: AsyncSession, ticket_id: UUID) -> List[dict]:
        from app.db.models.user import User
        result = await db.execute(
            select(TicketWatcher, User.username)
            .join(User, TicketWatcher.user_id == User.id)
            .filter(TicketWatcher.ticket_id == ticket_id)
        )
        return [{"id": row[0].id, "user_id": row[0].user_id, "username": row[1]} for row in result.all()]

    async def add_watcher(self, db: AsyncSession, ticket_id: UUID, user_id: UUID) -> bool:
        query = select(TicketWatcher).filter(TicketWatcher.ticket_id == ticket_id, TicketWatcher.user_id == user_id)
        res = await db.execute(query)
        if res.scalar_one_or_none():
            return False
        
        db.add(TicketWatcher(ticket_id=ticket_id, user_id=user_id))
        await db.commit()
        return True

    async def remove_watcher(self, db: AsyncSession, ticket_id: UUID, user_id: UUID) -> None:
        from sqlalchemy import delete
        await db.execute(delete(TicketWatcher).where(TicketWatcher.ticket_id == ticket_id, TicketWatcher.user_id == user_id))
        await db.commit()

    async def get_relations(self, db: AsyncSession, ticket_id: UUID) -> List["TicketRelation"]:
        from app.db.models.ticket import TicketRelation as TicketRelationModel
        result = await db.execute(
            select(TicketRelationModel).filter(
                (TicketRelationModel.source_ticket_id == ticket_id) | 
                (TicketRelationModel.target_ticket_id == ticket_id)
            )
        )
        return result.scalars().all()

    async def create_relation(self, db: AsyncSession, source_ticket_id: UUID, obj_in: "TicketRelationCreate") -> "TicketRelation":
        from app.db.models.ticket import TicketRelation as TicketRelationModel
        db_obj = TicketRelationModel(
            source_ticket_id=source_ticket_id,
            target_ticket_id=obj_in.target_ticket_id,
            relation_type=obj_in.relation_type
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get_subtasks(self, db: AsyncSession, ticket_id: UUID) -> List["TicketSubtask"]:
        from app.db.models.ticket import TicketSubtask as TicketSubtaskModel
        result = await db.execute(
            select(TicketSubtaskModel)
            .filter(TicketSubtaskModel.ticket_id == ticket_id)
            .order_by(TicketSubtaskModel.created_at.asc())
        )
        return result.scalars().all()

    async def create_subtask(self, db: AsyncSession, ticket_id: UUID, obj_in: "TicketSubtaskCreate") -> "TicketSubtask":
        from app.db.models.ticket import TicketSubtask as TicketSubtaskModel
        db_obj = TicketSubtaskModel(**obj_in.model_dump(), ticket_id=ticket_id)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update_subtask(self, db: AsyncSession, subtask_id: UUID, obj_in: "TicketSubtaskUpdate") -> Optional["TicketSubtask"]:
        from app.db.models.ticket import TicketSubtask as TicketSubtaskModel
        result = await db.execute(select(TicketSubtaskModel).filter(TicketSubtaskModel.id == subtask_id))
        db_obj = result.scalar_one_or_none()
        if not db_obj:
            return None
        
        update_data = obj_in.model_dump(exclude_unset=True)
        for var, value in update_data.items():
            setattr(db_obj, var, value)
        
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def delete_subtask(self, db: AsyncSession, subtask_id: UUID) -> bool:
        from app.db.models.ticket import TicketSubtask as TicketSubtaskModel
        from sqlalchemy import delete
        result = await db.execute(delete(TicketSubtaskModel).where(TicketSubtaskModel.id == subtask_id))
        await db.commit()
        return result.rowcount > 0

    async def bulk_update(self, db: AsyncSession, ticket_ids: List[UUID], **kwargs) -> int:
        from sqlalchemy import update as sa_update
        update_data = {k: v for k, v in kwargs.items() if v is not None}
        if not update_data:
            return 0
        
        result = await db.execute(
            sa_update(Ticket)
            .where(Ticket.id.in_(ticket_ids))
            .values(**update_data)
        )
        await db.commit()
        return result.rowcount

ticket = CRUDTicket()

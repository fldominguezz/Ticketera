from typing import Annotated, List, Optional, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api.deps import get_db, require_permission
from app.db.models import AuditLog, User
from app.services.group_service import group_service
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime

router = APIRouter()

class AuditLogSchema(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    event_type: str
    details: Optional[Any] = None
    ip_address: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

@router.get("", response_model=List[AuditLogSchema])
async def read_audit_logs(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("audit:read"))],
    ticket_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
):
    query = select(AuditLog)
    
    # Lógica de jerarquía para Auditoría
    if not current_user.is_superuser:
        if not current_user.group_id:
            return []
        group_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
        # Filtrar logs de usuarios que pertenecen a mi jerarquía
        query = query.join(User, AuditLog.user_id == User.id).filter(User.group_id.in_(group_ids))

    if ticket_id:
        # Filtrar logs donde el ticket_id esté dentro del campo JSONB details
        from sqlalchemy import cast, String
        query = query.filter(AuditLog.details["ticket_id"].astext == str(ticket_id))
    
    result = await db.execute(
        query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()
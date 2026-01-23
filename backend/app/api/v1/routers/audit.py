from typing import Annotated, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api.deps import get_db, get_current_superuser
from app.db.models import AuditLog, User
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, Any

router = APIRouter()

class AuditLogSchema(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    event_type: str
    details: Optional[Any] = None
    ip_address: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

@router.get("/", response_model=List[AuditLogSchema])
async def read_audit_logs(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_superuser)],
    skip: int = 0,
    limit: int = 100,
):
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()

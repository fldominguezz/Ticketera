from pydantic import BaseModel, ConfigDict
from typing import Optional, Any, Dict
from uuid import UUID
from datetime import datetime
class AuditLogBase(BaseModel):
    event_type: str
    details: Optional[Any] = None
    ip_address: Optional[str] = None
class AuditLogSchema(AuditLogBase):
    id: UUID
    user_id: Optional[UUID] = None
    username: Optional[str] = None
    created_at: datetime
    diff: Optional[Dict[str, Any]] = None
    model_config = ConfigDict(from_attributes=True)

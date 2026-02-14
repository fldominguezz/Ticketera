from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional
from datetime import datetime

class NotificationBase(BaseModel):
    title: str
    message: str
    link: Optional[str] = None

class NotificationCreate(NotificationBase):
    user_id: UUID

class Notification(NotificationBase):
    id: UUID
    is_read: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class NotificationUpdate(BaseModel):
    is_read: bool

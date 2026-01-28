from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional, List
from datetime import datetime

class GroupBase(BaseModel):
    name: str
    parent_id: Optional[UUID] = None
    description: Optional[str] = None
    hidden_nav_items: List[str] = []

class GroupCreate(GroupBase):
    pass

class GroupUpdate(GroupBase):
    name: Optional[str] = None
    description: Optional[str] = None
    hidden_nav_items: Optional[List[str]] = None

class GroupInDBBase(GroupBase):
    id: UUID
    parent_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class Group(GroupInDBBase):
    pass

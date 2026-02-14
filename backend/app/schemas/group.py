from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional, List
from datetime import datetime

class GroupBase(BaseModel):
    name: str
    parent_id: Optional[UUID] = None
    description: Optional[str] = None
    dashboard_layout: Optional[List[dict]] = []

class GroupCreate(GroupBase):
    pass

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[UUID] = None
    description: Optional[str] = None
    dashboard_layout: Optional[List[dict]] = None

class GroupInDBBase(GroupBase):
    id: UUID
    parent_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class Group(GroupInDBBase):
    pass

from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime

class LocationNodeBase(BaseModel):
    name: str
    path: str
    owner_group_id: Optional[UUID] = None
    permissions: Optional[str] = None
    parent_id: Optional[UUID] = None

class LocationNodeCreate(LocationNodeBase):
    pass

class LocationNodeUpdate(BaseModel):
    name: Optional[str] = None
    path: Optional[str] = None
    owner_group_id: Optional[UUID] = None
    permissions: Optional[str] = None
    parent_id: Optional[UUID] = None

class LocationNode(LocationNodeBase):
    id: UUID
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# For Tree View
class LocationNodeTree(LocationNode):
    children: List["LocationNodeTree"] = []

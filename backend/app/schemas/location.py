from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime
class LocationNodeBase(BaseModel):
    name: str
    path: Optional[str] = None
    owner_group_id: Optional[UUID] = None
    permissions: Optional[str] = None
    parent_id: Optional[UUID] = None
    dependency_code: Optional[str] = None
class LocationNodeCreate(LocationNodeBase):
    pass
class LocationNodeUpdate(BaseModel):
    name: Optional[str] = None
    path: Optional[str] = None
    owner_group_id: Optional[UUID] = None
    permissions: Optional[str] = None
    parent_id: Optional[UUID] = None
    dependency_code: Optional[str] = None
class LocationNode(LocationNodeBase):
    id: UUID
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    # Campos dinámicos para lógica tipo ESET
    total_assets: Optional[int] = 0
    direct_assets: Optional[int] = 0
    class Config:
        from_attributes = True
# For Tree View
class LocationNodeTree(LocationNode):
    children: List["LocationNodeTree"] = []
class LocationPagination(BaseModel):
    items: List[LocationNode]
    total: int
    page: int
    size: int
    pages: int
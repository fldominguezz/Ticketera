from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from datetime import datetime

# --- HISTORIAL ---
class WikiHistoryBase(BaseModel):
    change_summary: Optional[str] = None
    content_snapshot: str

class WikiHistory(WikiHistoryBase):
    id: UUID
    page_id: UUID
    editor_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- PAGES ---
class WikiPageBase(BaseModel):
    title: str
    content: Optional[str] = ""
    is_published: bool = True
    parent_id: Optional[UUID] = None
    is_folder: bool = False

class WikiPageCreate(WikiPageBase):
    space_id: UUID

class WikiPageUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_published: Optional[bool] = None
    parent_id: Optional[UUID] = None
    is_folder: Optional[bool] = None
    change_summary: Optional[str] = "Actualización menor"

class WikiPage(WikiPageBase):
    id: UUID
    space_id: UUID
    slug: Optional[str] = None
    view_count: int
    creator_id: UUID
    last_updated_by_id: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# --- SPACES ---
class WikiSpaceBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = "book"
    color: Optional[str] = "blue"
    is_private: bool = False
    owner_group_id: Optional[UUID] = None

class WikiSpaceCreate(WikiSpaceBase):
    pass

class WikiSpaceUpdate(WikiSpaceBase):
    pass

class WikiSpace(WikiSpaceBase):
    id: UUID
    creator_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    # No incluimos todas las páginas aquí para no sobrecargar, se piden aparte o lazy
    model_config = ConfigDict(from_attributes=True)

class WikiSpaceWithPages(WikiSpace):
    pages: List[WikiPage] = []

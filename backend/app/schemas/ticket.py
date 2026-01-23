from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional, Any, List
from datetime import datetime

class TicketBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "open"
    priority: Optional[str] = "medium"
    ticket_type_id: UUID
    group_id: UUID
    assigned_to_id: Optional[UUID] = None
    parent_ticket_id: Optional[UUID] = None
    sla_deadline: Optional[datetime] = None
    extra_data: Optional[Any] = None

class TicketCreate(TicketBase):
    pass

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to_id: Optional[UUID] = None
    extra_data: Optional[Any] = None

class TicketInDBBase(TicketBase):
    id: UUID
    created_by_id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class Ticket(TicketInDBBase):
    pass

class TicketCommentBase(BaseModel):
    content: str
    is_internal: bool = False

class TicketCommentCreate(TicketCommentBase):
    pass

class TicketComment(TicketCommentBase):
    id: UUID
    ticket_id: UUID
    user_id: UUID
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class TicketRelationCreate(BaseModel):
    target_ticket_id: UUID
    relation_type: str # relates_to, blocks, blocked_by, duplicate_of

class TicketRelation(TicketRelationCreate):
    id: UUID
    source_ticket_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TicketBulkUpdate(BaseModel):
    ticket_ids: List[UUID]
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to_id: Optional[UUID] = None

class TicketSubtaskBase(BaseModel):
    title: str
    is_completed: bool = False

class TicketSubtaskCreate(TicketSubtaskBase):
    pass

class TicketSubtaskUpdate(BaseModel):
    title: Optional[str] = None
    is_completed: Optional[bool] = None

class TicketSubtask(TicketSubtaskBase):
    id: UUID
    ticket_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

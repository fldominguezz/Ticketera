from typing import Optional
from pydantic import BaseModel
from uuid import UUID

class TicketTypeBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = "#0d6efd" # Azul por defecto
    requires_sla: bool = True
    has_severity: bool = True
    workflow_id: Optional[UUID] = None

class TicketTypeCreate(TicketTypeBase):
    pass

class TicketTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    requires_sla: Optional[bool] = None
    has_severity: Optional[bool] = None
    workflow_id: Optional[UUID] = None

class TicketType(TicketTypeBase):
    id: UUID

    class Config:
        from_attributes = True

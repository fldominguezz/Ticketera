from typing import Optional, List
from pydantic import BaseModel, Field
from uuid import UUID
# --- PASSWORD POLICY ---
class PasswordPolicyBase(BaseModel):
    min_length: int = 12
    requires_uppercase: bool = True
    requires_lowercase: bool = True
    requires_number: bool = True
    requires_special_char: bool = True
    enforce_2fa_all: bool = True
    expire_days: Optional[int] = None
class PasswordPolicyUpdate(PasswordPolicyBase):
    pass
class PasswordPolicy(PasswordPolicyBase):
    id: UUID
    class Config:
        from_attributes = True
# --- TICKET TYPES ---
class TicketTypeBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = "Ticket"
    color: Optional[str] = "#0d6efd"
    requires_sla: bool = True
    has_severity: bool = True
    workflow_id: Optional[UUID] = None
class TicketTypeCreate(TicketTypeBase):
    pass
class TicketType(TicketTypeBase):
    id: UUID
    class Config:
        from_attributes = True
# --- WORKFLOWS ---
class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None
class WorkflowCreate(WorkflowBase):
    pass
class Workflow(WorkflowBase):
    id: UUID
    class Config:
        from_attributes = True

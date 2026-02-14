from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional, Any, List
from datetime import datetime
class FormBase(BaseModel):
    name: str
    description: Optional[str] = None
    version: int = 1
    is_active: bool = True
    is_production: bool = False
    category: Optional[str] = None # 'ticket_creation' or 'asset_inventory'
    group_id: UUID
    fields_schema: dict # JSON schema for fields
    automation_rules: Optional[dict] = None
class FormCreate(FormBase):
    pass
class FormUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    is_production: Optional[bool] = None
    category: Optional[str] = None
    fields_schema: Optional[dict] = None
    automation_rules: Optional[dict] = None
class FormInDBBase(FormBase):
    id: UUID
    created_by_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
class Form(FormInDBBase):
    pass
class FormSubmissionBase(BaseModel):
    form_id: UUID
    data: dict
    group_id: UUID
class FormSubmissionCreate(FormSubmissionBase):
    pass
class FormSubmission(FormSubmissionBase):
    id: UUID
    submitted_by_id: UUID
    submitted_at: datetime
    created_ticket_id: Optional[UUID] = None
    created_endpoint_id: Optional[UUID] = None
    model_config = ConfigDict(from_attributes=True)

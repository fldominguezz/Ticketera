from typing import Optional, List
from pydantic import BaseModel, Field, model_validator
from uuid import UUID
from datetime import datetime

class SIEMConfigurationBase(BaseModel):
    siem_user_id: Optional[UUID] = None
    default_group_id: Optional[UUID] = None
    ticket_type_id: Optional[UUID] = None
    api_username: str
    api_password: Optional[str] = None
    allowed_ips: str
    is_active: bool = True

class SIEMConfigurationUpdate(SIEMConfigurationBase):
    pass

class SIEMConfiguration(SIEMConfigurationBase):
    id: UUID
    last_test_status: Optional[str] = None
    last_error_message: Optional[str] = None
    last_test_at: Optional[datetime] = None

    @model_validator(mode='after')
    def mask_password(self) -> 'SIEMConfiguration':
        # Remove password completely from the response to the frontend
        self.api_password = None
        return self

    class Config:
        from_attributes = True

class SIEMTestResult(BaseModel):
    status: str
    message: str
    details: Optional[dict] = None

from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional, Any
from datetime import datetime

class EndpointBase(BaseModel):
    hostname: str
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    group_id: UUID
    product: Optional[str] = None
    status: Optional[str] = "active"
    technical_user_id: Optional[UUID] = None
    observations: Optional[str] = None
    extra_data: Optional[Any] = None

class EndpointCreate(EndpointBase):
    pass

class EndpointUpdate(EndpointBase):
    hostname: Optional[str] = None
    group_id: Optional[UUID] = None
    pass

class EndpointInDBBase(EndpointBase):
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class Endpoint(EndpointInDBBase):
    pass
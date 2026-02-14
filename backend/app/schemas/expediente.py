from typing import Optional, List
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

# Shared properties
class ExpedienteBase(BaseModel):
    number: str
    title: str
    description: Optional[str] = None
    status: Optional[str] = "active"

# Properties to receive via API on creation
class ExpedienteCreate(ExpedienteBase):
    pass

# Properties to receive via API on update
class ExpedienteUpdate(ExpedienteBase):
    number: Optional[str] = None
    title: Optional[str] = None

class ExpedienteInDBBase(ExpedienteBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Additional properties to return via API
class Expediente(ExpedienteInDBBase):
    pass

# Additional properties stored in DB
class ExpedienteInDB(ExpedienteInDBBase):
    pass

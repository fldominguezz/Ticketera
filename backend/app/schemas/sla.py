from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional
class SLAPolicyBase(BaseModel):
    name: str
    priority: str
    response_time_goal: int
    resolution_time_goal: int
    is_active: Optional[bool] = True
class SLAPolicyCreate(SLAPolicyBase):
    pass
class SLAPolicyUpdate(BaseModel):
    name: Optional[str] = None
    response_time_goal: Optional[int] = None
    resolution_time_goal: Optional[int] = None
    is_active: Optional[bool] = None
class SLAPolicy(SLAPolicyBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)

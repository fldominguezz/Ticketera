from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional, Dict, Any, List
from datetime import datetime
class PluginBase(BaseModel):
    name: str
    description: Optional[str] = None
    version: Optional[str] = "1.0.0"
    is_active: bool = False
    config: Optional[Dict[str, Any]] = None
class PluginCreate(PluginBase):
    pass
class PluginUpdate(PluginBase):
    name: Optional[str] = None
class Plugin(PluginBase):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
class UpdateCheck(BaseModel):
    update_available: bool
    current_version: str
    latest_version: str
    changelog: Optional[List[str]] = None

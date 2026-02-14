from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from uuid import UUID

class WidgetConfig(BaseModel):
    id: str
    type: str  # kpi, chart_bar, chart_line, chart_donut, table
    title: str
    data_source: str # tickets_count, siem_alerts, assets_status, etc.
    size_x: int = Field(1, alias="w")
    size_y: int = Field(1, alias="h")
    pos_x: int = Field(0, alias="x")
    pos_y: int = Field(0, alias="y")
    refresh_interval: int = 0 # en segundos, 0 es desactivado
    filters: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True

    class Config:
        populate_by_name = True

class DashboardConfigBase(BaseModel):
    name: str
    description: Optional[str] = None
    layout: List[WidgetConfig]
    is_default: bool = False

class DashboardConfigCreate(DashboardConfigBase):
    group_id: Optional[UUID] = None

class DashboardConfigUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    layout: Optional[List[WidgetConfig]] = None
    is_default: Optional[bool] = None
    is_locked: Optional[bool] = None

class DashboardConfig(DashboardConfigBase):
    id: UUID
    user_id: Optional[UUID] = None
    group_id: Optional[UUID] = None
    is_locked: bool

    class Config:
        from_attributes = True

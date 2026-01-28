from pydantic import BaseModel, Field, validator
from typing import Optional, Any, Dict, List
from datetime import date as dt_date
from uuid import UUID

class DailyReportBase(BaseModel):
    date: dt_date
    shift: str = Field(..., pattern="^(DIA|NOCHE)$")
    report_data: Dict[str, Any]

class DailyReportCreate(DailyReportBase):
    pass

class DailyReportUpdate(BaseModel):
    report_data: Optional[Dict[str, Any]] = None

class DailyReportInDBBase(DailyReportBase):
    id: UUID
    file_path: str
    search_content: Optional[str] = None
    created_at: Any
    created_by_id: Optional[UUID]

    class Config:
        from_attributes = True

class DailyReport(DailyReportInDBBase):
    pass

class DailyReportSearchResults(BaseModel):
    results: List[DailyReport]
    count: int

# Specific schema for tool health
class ToolHealth(BaseModel):
    health: str # OK / DEGRADADO / CAIDO / MANTENIMIENTO or free text
    obs: Optional[str] = ""

class DailyReportInput(BaseModel):
    date: Optional[dt_date] = None # Defaults to today if not present
    shift: str = Field(..., pattern="^(DIA|NOCHE)$")
    
    # Licenses (numerators)
    eset_soc_lic_usadas: int = Field(..., ge=0, le=700)
    eset_soc_mobile_usadas: int = Field(..., ge=0, le=700)
    eset_bienestar_lic_usadas: int = Field(..., ge=0, le=1550)
    ems_lic_usadas: int = Field(..., ge=0, le=1000)
    
    # Incidentes/Counters
    eset_bienestar_incidentes: str = "-?-"
    edr_colectores_ws: str = "-?-"
    edr_colectores_srv: str = "-?-"
    bloqueo_srd: str = "-?-"
    bloqueo_cfd: str = "-?-"

    # Tools Health & Obs
    fortisiem: ToolHealth
    fortisandbox: ToolHealth
    forticlient_ems: ToolHealth
    fortianalyzer: ToolHealth
    fortiedr: ToolHealth
    eset_soc: ToolHealth
    eset_bienestar: ToolHealth
    
    # Others
    correo_obs: Optional[str] = ""
    novedades_generales: List[str] = []

    @validator('date', pre=True)
    def parse_date(cls, v):
        if v == "" or v is None:
            return dt_date.today()
        return v
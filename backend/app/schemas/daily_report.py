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
    group_id: Optional[UUID] = None
    group_name: Optional[str] = None

    @validator('group_name', pre=True, always=True)
    def extract_group_name(cls, v, values):
        # Si v viene de la relación ORM (objeto Group)
        if hasattr(v, 'name'):
            return v.name
        # Si v es null pero tenemos el objeto ORM en 'values' (no accesible fácilmente en pre-validator sin root context)
        # En Pydantic v1 'values' tiene los campos ya procesados.
        # Mejor estrategia: Dejar que el ORM lo pase si mapeamos 'group_name' a 'group.name' en el router o usar un getter.
        return v

    class Config:
        from_attributes = True

class DailyReport(DailyReportInDBBase):
    @validator('group_name', pre=True, always=True, check_fields=False)
    def extract_group_name_from_rel(cls, v, values):
        # values contiene los datos crudos del objeto ORM en modo from_attributes
        # Pero validator pre=True recibe el valor del campo 'group_name' (que es None en DB)
        # Necesitamos acceder al objeto raiz. En Pydantic v1 es difícil en validadores de campo.
        return v

    @staticmethod
    def _flatten_group_name(orm_obj):
        # Helper para uso manual si fuera necesario, pero intentaremos que Pydantic lo resuelva si
        # mapeamos la propiedad.
        if hasattr(orm_obj, 'group') and orm_obj.group:
            return orm_obj.group.name
        return None

    class Config:
        from_attributes = True
        # Forzamos que group_name se lea de group.name si es posible? No directo.



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
    group_id: Optional[UUID] = None # Optional target group
    
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
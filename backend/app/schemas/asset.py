from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from datetime import datetime

# --- HISTORIAL ---
class AssetInstallRecord(BaseModel):
    id: UUID
    asset_id: UUID
    gde_number: Optional[str] = None
    tecnico_instalacion: Optional[str] = None
    tecnico_carga: Optional[str] = None
    observations: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AssetLocationHistory(BaseModel):
    id: UUID
    new_location_id: UUID
    reason: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AssetIPHistory(BaseModel):
    id: UUID
    ip_address: str
    assigned_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- ACTIVO ---
class Asset(BaseModel):
    id: UUID
    hostname: str
    serial: Optional[str] = None
    asset_tag: Optional[str] = None
    mac_address: Optional[str] = None
    ip_address: Optional[str] = None
    dependencia: Optional[str] = None
    codigo_dependencia: Optional[str] = None
    status: str = "operative"
    criticality: str = "medium"
    av_product: Optional[str] = None
    device_type: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    last_seen: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class AssetWithDetails(Asset):
    location_history: List[AssetLocationHistory] = []
    install_records: List[AssetInstallRecord] = []
    ip_history: List[AssetIPHistory] = []
    model_config = ConfigDict(from_attributes=True)

# --- REQUESTS ---
class AssetCreate(BaseModel):
    hostname: str
    serial: Optional[str] = None
    mac_address: Optional[str] = None
    ip_address: Optional[str] = None
    dependencia: Optional[str] = None
    codigo_dependencia: Optional[str] = None
    device_type: Optional[str] = None
    os_name: Optional[str] = None
    av_product: Optional[str] = None
    status: Optional[str] = "operative"
    observations: Optional[str] = None
    responsible_user_id: Optional[UUID] = None
    location_node_id: Optional[UUID] = None

class AssetUpdate(BaseModel):
    hostname: Optional[str] = None
    serial: Optional[str] = None
    asset_tag: Optional[str] = None
    mac_address: Optional[str] = None
    ip_address: Optional[str] = None
    dependencia: Optional[str] = None
    codigo_dependencia: Optional[str] = None
    status: Optional[str] = None
    criticality: Optional[str] = None
    av_product: Optional[str] = None
    device_type: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    observations: Optional[str] = None
    location_node_id: Optional[UUID] = None
    owner_group_id: Optional[UUID] = None
    responsible_user_id: Optional[UUID] = None

class AssetInstallRecordCreate(BaseModel):
    gde_number: Optional[str] = None
    tecnico_instalacion: Optional[str] = None
    tecnico_carga: Optional[str] = None
    observations: Optional[str] = None

class AssetInstallRequest(BaseModel):
    asset_data: AssetCreate
    install_data: AssetInstallRecordCreate
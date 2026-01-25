from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime

# --- Install Record Schemas ---
class AssetInstallRecordBase(BaseModel):
    gde_number: Optional[str] = None
    install_details: Optional[Any] = None
    snapshot_url: Optional[str] = None
    observations: Optional[str] = None

class AssetInstallRecordCreate(AssetInstallRecordBase):
    pass

class AssetInstallRecord(AssetInstallRecordBase):
    id: UUID
    asset_id: UUID
    created_by_id: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Asset Schemas ---
class AssetBase(BaseModel):
    hostname: str
    serial: Optional[str] = None
    asset_tag: Optional[str] = None
    mac_address: Optional[str] = None
    ip_address: Optional[str] = None
    
    location_node_id: Optional[UUID] = None
    division: Optional[str] = None
    owner_group_id: Optional[UUID] = None
    responsible_user_id: Optional[UUID] = None
    
    status: Optional[str] = "operative"
    criticality: Optional[str] = "medium"
    
    av_product: Optional[str] = None
    source_system: Optional[str] = "manual"
    external_id: Optional[str] = None
    
    device_type: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    
    observations: Optional[str] = None

class AssetCreate(AssetBase):
    # For creation/installation, we might require location
    location_node_id: UUID 

class AssetUpdate(BaseModel):
    hostname: Optional[str] = None
    serial: Optional[str] = None
    asset_tag: Optional[str] = None
    mac_address: Optional[str] = None
    ip_address: Optional[str] = None
    location_node_id: Optional[UUID] = None
    division: Optional[str] = None
    owner_group_id: Optional[UUID] = None
    responsible_user_id: Optional[UUID] = None
    status: Optional[str] = None
    criticality: Optional[str] = None
    av_product: Optional[str] = None
    source_system: Optional[str] = None
    device_type: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    observations: Optional[str] = None
    last_seen: Optional[datetime] = None

class Asset(AssetBase):
    id: UUID
    last_seen: Optional[datetime] = None
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# --- History Schemas ---
class AssetLocationHistory(BaseModel):
    id: UUID
    previous_location_id: Optional[UUID] = None
    new_location_id: UUID
    changed_by_user_id: Optional[UUID] = None
    reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AssetIPHistory(BaseModel):
    id: UUID
    ip_address: str
    source: Optional[str] = None
    assigned_at: datetime

    class Config:
        from_attributes = True

class AssetWithDetails(Asset):
    location_history: List[AssetLocationHistory] = []
    install_records: List[AssetInstallRecord] = []
    ip_history: List[AssetIPHistory] = []

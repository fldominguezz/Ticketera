from typing import List, Optional, Union
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_

from app.db.models.asset import Asset
from app.db.models.asset_history import AssetLocationHistory, AssetIPHistory, AssetInstallRecord
from app.schemas.asset import AssetCreate, AssetUpdate, AssetInstallRecordCreate

from sqlalchemy.sql import func

class CRUDAsset:
    async def get(self, db: AsyncSession, id: UUID) -> Optional[Asset]:
        result = await db.execute(select(Asset).filter(Asset.id == id, Asset.deleted_at == None))
        return result.scalar_one_or_none()

    async def get_multi(self, db: AsyncSession, skip: int = 0, limit: int = 100, location_node_id: Optional[UUID] = None) -> List[Asset]:
        query = select(Asset).filter(Asset.deleted_at == None)
        if location_node_id:
            query = query.filter(Asset.location_node_id == location_node_id)
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    async def remove(self, db: AsyncSession, id: UUID) -> Optional[Asset]:
        result = await db.execute(select(Asset).filter(Asset.id == id))
        db_obj = result.scalar_one_or_none()
        if db_obj:
            db_obj.deleted_at = func.now()
            db_obj.status = "decommissioned"
            db.add(db_obj)
            await db.commit()
            await db.refresh(db_obj)
        return db_obj

    async def create(self, db: AsyncSession, obj_in: AssetCreate) -> Asset:
        db_obj = Asset(**obj_in.model_dump())
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        
        # Initial History Records
        if db_obj.location_node_id:
            loc_history = AssetLocationHistory(
                asset_id=db_obj.id,
                new_location_id=db_obj.location_node_id,
                reason="Initial creation"
            )
            db.add(loc_history)
        
        if db_obj.ip_address:
            ip_history = AssetIPHistory(
                asset_id=db_obj.id,
                ip_address=db_obj.ip_address,
                source=db_obj.source_system
            )
            db.add(ip_history)
            
        await db.commit()
        return db_obj

    async def update(self, db: AsyncSession, db_obj: Asset, obj_in: AssetUpdate, user_id: Optional[UUID] = None) -> Asset:
        old_location_id = db_obj.location_node_id
        old_ip = db_obj.ip_address
        
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
            
        db.add(db_obj)
        
        # Track Location Change
        if obj_in.location_node_id and obj_in.location_node_id != old_location_id:
            loc_history = AssetLocationHistory(
                asset_id=db_obj.id,
                previous_location_id=old_location_id,
                new_location_id=obj_in.location_node_id,
                changed_by_user_id=user_id,
                reason="Update via API"
            )
            db.add(loc_history)
            
        # Track IP Change
        if obj_in.ip_address and obj_in.ip_address != old_ip:
             ip_history = AssetIPHistory(
                asset_id=db_obj.id,
                ip_address=obj_in.ip_address,
                source=db_obj.source_system or "manual"
            )
             db.add(ip_history)

        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def find_existing_asset(self, db: AsyncSession, serial: str = None, mac: str = None, hostname: str = None, ip: str = None) -> Optional[Asset]:
        # Deduplication Logic: Serial -> MAC -> Hostname -> IP
        if serial:
            res = await db.execute(select(Asset).filter(Asset.serial == serial))
            asset = res.scalar_one_or_none()
            if asset: return asset
        
        if mac:
            res = await db.execute(select(Asset).filter(Asset.mac_address == mac))
            asset = res.scalar_one_or_none()
            if asset: return asset
            
        if hostname:
            res = await db.execute(select(Asset).filter(Asset.hostname == hostname))
            asset = res.scalar_one_or_none()
            if asset: return asset
            
        if ip:
            res = await db.execute(select(Asset).filter(Asset.ip_address == ip))
            asset = res.scalar_one_or_none()
            if asset: return asset
            
        return None

    async def process_installation(self, db: AsyncSession, asset_data: AssetCreate, install_data: AssetInstallRecordCreate, user_id: UUID) -> Asset:
        # 1. Find or Create Asset
        existing_asset = await self.find_existing_asset(
            db, 
            serial=asset_data.serial, 
            mac=asset_data.mac_address, 
            hostname=asset_data.hostname, 
            ip=asset_data.ip_address
        )
        
        if existing_asset:
            # Update existing
            # Prepare update data from create data
            update_dict = asset_data.model_dump(exclude_unset=True)
            # Remove fields strictly for creation if any, or just apply
            # Note: We want to update location!
            asset_update = AssetUpdate(**update_dict)
            asset = await self.update(db, existing_asset, asset_update, user_id=user_id)
            asset.last_seen = datetime.now()
            db.add(asset)
        else:
            # Create new
            asset = await self.create(db, asset_data)
            asset.last_seen = datetime.now()
            db.add(asset)
        
        # 2. Create Install Record
        install_record = AssetInstallRecord(
            **install_data.model_dump(),
            asset_id=asset.id,
            created_by_id=user_id
        )
        db.add(install_record)

        # 3. Notify if status is tagging_pending
        if asset.status == "tagging_pending":
            from app.services.notification_service import notification_service
            await notification_service.notify_all_active(
                db,
                title="Equipos pendientes de etiquetado",
                message=f"El Area técnica ha instalado unos equipos, queda pendiente etiquetarlos. Hostname: {asset.hostname}",
                link=f"/inventory?location_id={asset.location_node_id}"
            )
        
        await db.commit()
        await db.refresh(asset)
        return asset

asset = CRUDAsset()

from typing import List, Optional, Union
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from app.db.models.asset import Asset
from app.db.models.asset_history import AssetLocationHistory, AssetIPHistory, AssetInstallRecord, AssetEventLog
from app.schemas.asset import AssetCreate, AssetUpdate, AssetInstallRecordCreate
from sqlalchemy.sql import func
from app.services.search_service import search_service

class CRUDAsset:
    async def get(self, db: AsyncSession, id: UUID) -> Optional[Asset]:
        result = await db.execute(select(Asset).filter(Asset.id == id, Asset.deleted_at == None))
        return result.scalar_one_or_none()

    async def get_multi(self, db: AsyncSession, skip: int = 0, limit: int = 100, location_node_id: Optional[UUID] = None, show_decommissioned: bool = False) -> List[Asset]:
        query = select(Asset)
        if not show_decommissioned:
            query = query.filter(Asset.deleted_at == None, Asset.status != "decommissioned")
        if location_node_id:
            query = query.filter(Asset.location_node_id == location_node_id)
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    async def remove(self, db: AsyncSession, id: UUID) -> Optional[Asset]:
        """
        Baja lógica: Marca como decommissioned y establece deleted_at.
        """
        result = await db.execute(select(Asset).filter(Asset.id == id))
        db_obj = result.scalar_one_or_none()
        if db_obj:
            db_obj.deleted_at = func.now()
            db_obj.status = "decommissioned"
            db.add(db_obj)
            await db.commit()
            await db.refresh(db_obj, attribute_names=[
                "id", "hostname", "serial", "asset_tag", "mac_address", "ip_address",
                "location_node_id", "dependencia", "codigo_dependencia", "owner_group_id", "responsible_user_id",
                "status", "criticality", "av_product", "device_type", "os_name", "os_version", "observations", "last_seen",
                "created_at", "updated_at", "deleted_at"
            ])
            try:
                search_service.delete_asset(str(db_obj.id))
            except Exception as e:
                logger.warning(f"Failed to delete asset from search: {e}")
        return db_obj

    async def hard_delete(self, db: AsyncSession, id: UUID) -> bool:
        """
        Borrado físico: Elimina el registro de la base de datos.
        """
        result = await db.execute(select(Asset).filter(Asset.id == id))
        db_obj = result.scalar_one_or_none()
        if db_obj:
            await db.delete(db_obj)
            await db.commit()
            try:
                search_service.delete_asset(str(id))
            except Exception as e:
                logger.warning(f"Failed to hard delete asset from search: {e}")
            return True
        return False

    async def create(self, db: AsyncSession, obj_in: AssetCreate) -> Asset:
        db_obj = Asset(**obj_in.model_dump())
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj, attribute_names=[
            "id", "hostname", "serial", "asset_tag", "mac_address", "ip_address",
            "location_node_id", "dependencia", "codigo_dependencia", "owner_group_id", "responsible_user_id",
            "status", "criticality", "av_product", "device_type", "os_name", "os_version", "observations", "last_seen",
            "created_at", "updated_at"
        ])
        
        # Indexar en Meilisearch
        try:
            asset_data = {
                "id": str(db_obj.id),
                "hostname": db_obj.hostname,
                "ip_address": db_obj.ip_address,
                "mac_address": db_obj.mac_address,
                "serial": db_obj.serial,
                "asset_tag": db_obj.asset_tag,
                "status": db_obj.status,
                "criticality": db_obj.criticality,
                "location_node_id": str(db_obj.location_node_id) if db_obj.location_node_id else None,
                "dependencia": db_obj.dependencia,
                "codigo_dependencia": db_obj.codigo_dependencia,
                "device_type": db_obj.device_type,
                "last_seen": db_obj.last_seen.isoformat() if db_obj.last_seen else None
            }
            search_service.index_asset(asset_data)
        except Exception as e:
            logger.warning(f"Failed to index asset: {e}")

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
                source="manual"
            )
            db.add(ip_history)
        await db.commit()
        return db_obj

    async def update(self, db: AsyncSession, db_obj: Asset, obj_in: AssetUpdate, user_id: Optional[UUID] = None) -> Asset:
        old_location_id = db_obj.location_node_id
        old_ip = db_obj.ip_address
        old_status = db_obj.status
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        if obj_in.location_node_id and obj_in.location_node_id != old_location_id:
            loc_history = AssetLocationHistory(
                asset_id=db_obj.id,
                previous_location_id=old_location_id,
                new_location_id=obj_in.location_node_id,
                changed_by_user_id=user_id,
                reason="Update via API"
            )
            db.add(loc_history)
            # Log de Evento: Movimiento
            from app.db.models.location import LocationNode
            res_loc = await db.execute(select(LocationNode).where(LocationNode.id == obj_in.location_node_id))
            new_loc = res_loc.scalar_one_or_none()
            event = AssetEventLog(
                asset_id=db_obj.id,
                event_type="move",
                description=f"Movido a {new_loc.name if new_loc else 'nueva ubicación'}",
                user_id=user_id
            )
            db.add(event)
            # Notificar cambio de ubicación
            from app.services.notification_service import notification_service
            await notification_service.notify_admins(
                db,
                title="📍 Activo Movido",
                message=f"El equipo {db_obj.hostname} fue movido a: {new_loc.name if new_loc else 'Desconocida'}",
                link=f"/inventory?hostname={db_obj.hostname}"
            )
        if obj_in.status and obj_in.status != old_status:
            event = AssetEventLog(
                asset_id=db_obj.id,
                event_type="status_change",
                description=f"Estado cambiado de {old_status} a {obj_in.status}",
                user_id=user_id,
                details={"old": old_status, "new": obj_in.status}
            )
            db.add(event)
        if hasattr(obj_in, 'ip_address') and obj_in.ip_address and obj_in.ip_address != old_ip:
             ip_history = AssetIPHistory(
                asset_id=db_obj.id,
                ip_address=obj_in.ip_address,
                source="manual"
            )
             db.add(ip_history)
        await db.commit()
        await db.refresh(db_obj, attribute_names=[
            "id", "hostname", "serial", "asset_tag", "mac_address", "ip_address",
            "location_node_id", "dependencia", "codigo_dependencia", "owner_group_id", "responsible_user_id",
            "status", "criticality", "av_product", "device_type", "os_name", "os_version", "observations", "last_seen",
            "created_at", "updated_at"
        ])

        # Actualizar en Meilisearch
        try:
            asset_data = {
                "id": str(db_obj.id),
                "hostname": db_obj.hostname,
                "ip_address": db_obj.ip_address,
                "mac_address": db_obj.mac_address,
                "serial": db_obj.serial,
                "asset_tag": db_obj.asset_tag,
                "status": db_obj.status,
                "criticality": db_obj.criticality,
                "location_node_id": str(db_obj.location_node_id) if db_obj.location_node_id else None,
                "dependencia": db_obj.dependencia,
                "codigo_dependencia": db_obj.codigo_dependencia,
                "device_type": db_obj.device_type,
                "last_seen": db_obj.last_seen.isoformat() if db_obj.last_seen else None
            }
            search_service.index_asset(asset_data)
        except Exception as e:
            logger.warning(f"Failed to index asset: {e}")

        return db_obj
    async def find_existing_asset(self, db: AsyncSession, serial: str = None, mac: str = None, hostname: str = None, ip: str = None) -> Optional[Asset]:
        # 1. Prioridad absoluta: Dirección MAC (Es lo más único en una red)
        if mac and mac.strip() and mac.upper() not in ["---", "00:00:00:00:00:00"]:
            res = await db.execute(select(Asset).filter(Asset.mac_address == mac.strip().upper()))
            asset = res.scalar_one_or_none()
            if asset: return asset
        # 2. Segunda prioridad: Número de Serie (Si no es genérico)
        generic_serials = ["S/N", "SN", "NONE", "UNKNOWN", "000000", "123456", "---", ""]
        if serial and serial.strip().upper() not in generic_serials:
            res = await db.execute(select(Asset).filter(Asset.serial == serial.strip().upper()))
            asset = res.scalar_one_or_none()
            if asset: return asset
        # Nota: Hostname e IP ya no se usan para desduplicar porque pueden rotar o repetirse.
        return None
    async def process_installation(self, db: AsyncSession, asset_data: AssetCreate, install_data: AssetInstallRecordCreate, user_id: UUID) -> Asset:
        # Extraer datos adicionales de install_details si existen
        install_record_data = install_data.model_dump()
        details = install_record_data.get("install_details") or {}
        # Si el frontend envía OS/AV en details, los movemos al asset_data si este no los tiene
        if details.get("os") and not asset_data.os_name:
            asset_data.os_name = details.get("os")
        if details.get("av") and not asset_data.av_product:
            asset_data.av_product = details.get("av")
        existing_asset = await self.find_existing_asset(
            db, 
            serial=asset_data.serial, 
            mac=asset_data.mac_address, 
            hostname=asset_data.hostname, 
            ip=asset_data.ip_address
        )
        if existing_asset:
            # Forzamos la actualización de todos los campos que vienen del frontend
            update_data = asset_data.model_dump() # Sin exclude_unset para capturar todo lo enviado
            # Limpieza de nulos si fuera necesario, pero aquí queremos que pise lo que haya
            for field, value in update_data.items():
                if value is not None:
                    setattr(existing_asset, field, value)
            # Manejo especial de campos técnicos del registro de instalación
            if details.get("os"): existing_asset.os_name = details.get("os")
            if details.get("av"): existing_asset.av_product = details.get("av")
            if asset_data.observations: existing_asset.observations = asset_data.observations
            existing_asset.last_seen = datetime.now()
            db.add(existing_asset)
            asset = existing_asset
        else:
            # Creación limpia con todos los campos
            create_data = asset_data.model_dump()
            if details.get("os"): create_data["os_name"] = details.get("os")
            if details.get("av"): create_data["av_product"] = details.get("av")
            asset = Asset(**create_data)
            asset.last_seen = datetime.now()
            db.add(asset)
        await db.flush() # Guardar cambios para tener el ID del asset antes del record
        install_record_data = install_data.model_dump()
        install_record = AssetInstallRecord(
            asset_id=asset.id,
            created_by_id=user_id,
            gde_number=install_record_data.get("gde_number"),
            tecnico_instalacion=install_record_data.get("tecnico_instalacion"),
            tecnico_carga=install_record_data.get("tecnico_carga"),
            install_details=install_record_data.get("install_details"),
            observations=install_record_data.get("observations"),
            snapshot_url=install_record_data.get("snapshot_url")
        )
        db.add(install_record)

        # Vincular como Expediente GDE oficial para que aparezca en la solapa correspondiente
        if install_record_data.get('gde_number'):
            from app.db.models.expediente import Expediente
            gde_num = install_record_data.get('gde_number')
            res_exp = await db.execute(select(Expediente).where(Expediente.number == gde_num))
            exp_obj = res_exp.scalar_one_or_none()
            if not exp_obj:
                exp_obj = Expediente(
                    number=gde_num,
                    title=f"Instalación de {asset.hostname}",
                    description=f"Expediente de instalación registrado por {user_id}"
                )
                db.add(exp_obj)
                await db.flush()
            
            # Cargar relación si no está
            await db.refresh(asset, attribute_names=["expedientes"])
            if exp_obj not in asset.expedientes:
                asset.expedientes.append(exp_obj)

        # Log de Evento: Instalación
        install_event = AssetEventLog(
            asset_id=asset.id,
            event_type="install",
            description=f"Instalación registrada bajo GDE {install_record_data.get('gde_number')}",
            user_id=user_id,
            details={"gde": install_record_data.get('gde_number')}
        )
        db.add(install_event)
        await db.commit()
        if asset.status == "tagging_pending":
            from app.services.notification_service import notification_service
            await notification_service.notify_all_active(
                db,
                title="🖥️ Nuevo Equipo Instalado",
                message=f"Se ha registrado una nueva instalación. Pendiente etiquetado técnico. Hostname: {asset.hostname}",
                link=f"/inventory/{asset.id}"
            )
        await db.refresh(asset, attribute_names=[
            "id", "hostname", "serial", "asset_tag", "mac_address", "ip_address",
            "location_node_id", "dependencia", "codigo_dependencia", "owner_group_id", "responsible_user_id",
            "status", "criticality", "av_product", "device_type", "os_name", "os_version", "observations", "last_seen",
            "created_at", "updated_at"
        ])
        return asset
asset = CRUDAsset()
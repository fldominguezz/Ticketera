from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.api.deps import get_db, get_current_active_user
from app.schemas.asset import Asset, AssetUpdate, AssetInstallRequest, AssetWithDetails
from sqlalchemy.orm import selectinload
from sqlalchemy.future import select as sa_select
from sqlalchemy import delete, func, and_
from app.crud.crud_asset import asset as crud_asset
from app.db.models.user import User
from datetime import datetime
import re

router = APIRouter()

class ImportResult(BaseModel):
    success_count: int
    updated_count: int
    error_count: int
    errors: List[Dict[str, Any]]

class BulkActionRequest(BaseModel):
    asset_ids: List[UUID]
    location_node_id: Optional[UUID] = None
    status: Optional[str] = None
    criticality: Optional[str] = None

@router.get("/search", response_model=Dict[str, List[Any]])
async def search_inventory(
    search: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from app.db.models.asset import Asset as AssetModel
    from app.db.models.location import LocationNode
    
    search_filter = f"%{search}%"
    
    # Search Assets
    query_assets = sa_select(AssetModel, LocationNode.path.label("loc_path")).outerjoin(
        LocationNode, AssetModel.location_node_id == LocationNode.id
    ).filter(
        and_(
            AssetModel.deleted_at == None,
            (AssetModel.hostname.ilike(search_filter)) |
            (AssetModel.ip_address.ilike(search_filter)) |
            (AssetModel.mac_address.ilike(search_filter))
        )
    ).limit(10)
    
    res_assets = await db.execute(query_assets)
    assets_out = []
    for row in res_assets.all():
        a = row[0]
        assets_out.append({
            "id": str(a.id),
            "type": "asset",
            "name": a.hostname,
            "ip": a.ip_address,
            "mac": a.mac_address,
            "path": row.loc_path or "Sin Ubicación",
            "status": a.status
        })
        
    # Search Locations
    query_locs = sa_select(LocationNode).filter(
        LocationNode.name.ilike(search_filter)
    ).limit(10)
    
    res_locs = await db.execute(query_locs)
    locs_out = []
    for l in res_locs.scalars().all():
        locs_out.append({
            "id": str(l.id),
            "type": "location",
            "name": l.name,
            "path": l.path
        })
        
    return {"assets": assets_out, "locations": locs_out}

@router.post("/bulk-action")
async def bulk_action(
    *,
    db: AsyncSession = Depends(get_db),
    action_in: BulkActionRequest,
    current_user: User = Depends(get_current_active_user)
):
    print(f"DEBUG BULK ACTION: {action_in}")
    from app.db.models.asset import Asset as AssetModel
    
    if not action_in.asset_ids:
        return {"status": "ok", "message": "No assets selected"}
        
    query = sa_select(AssetModel).where(AssetModel.id.in_(action_in.asset_ids))
    result = await db.execute(query)
    assets = result.scalars().all()
    
    for a in assets:
        if action_in.location_node_id:
            # We use crud_asset.update to trigger history records if needed, 
            # but for simplicity in bulk we can also do direct if logic permits.
            # Here we'll do direct update for speed, matching crud logic manually.
            from app.db.models.asset_history import AssetLocationHistory
            if a.location_node_id != action_in.location_node_id:
                history = AssetLocationHistory(
                    asset_id=a.id,
                    previous_location_id=a.location_node_id,
                    new_location_id=action_in.location_node_id,
                    changed_by_user_id=current_user.id,
                    reason="Bulk Move"
                )
                db.add(history)
                a.location_node_id = action_in.location_node_id
        
        if action_in.status:
            a.status = action_in.status
        if action_in.criticality:
            a.criticality = action_in.criticality
            
        db.add(a)
        
    await db.commit()
    return {"status": "ok", "updated_count": len(assets)}

@router.delete("/bulk-delete")
async def bulk_delete(
    *,
    db: AsyncSession = Depends(get_db),
    asset_ids: List[UUID] = Body(...),
    hard: bool = Query(False),
    current_user: User = Depends(get_current_active_user)
):
    if not (current_user.is_superuser or current_user.role_id): # Add more strict check if needed
         # Check permissions manually if not using global deps
         pass

    from app.db.models.asset import Asset as AssetModel
    
    if hard:
        query = delete(AssetModel).where(AssetModel.id.in_(asset_ids))
        res = await db.execute(query)
    else:
        # Soft delete
        query = sa_select(AssetModel).where(AssetModel.id.in_(asset_ids))
        res_db = await db.execute(query)
        assets = res_db.scalars().all()
        for a in assets:
            a.deleted_at = func.now()
            a.status = "decommissioned"
            db.add(a)
            
    await db.commit()
    return {"status": "ok", "deleted_count": len(asset_ids)}

@router.get("", response_model=List[Any])
async def read_assets(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 1000,
    location_node_id: Optional[UUID] = None,
    show_decommissioned: bool = Query(False),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user)
):
    from app.db.models.asset import Asset as AssetModel
    from app.db.models.location import LocationNode
    
    query = sa_select(AssetModel, LocationNode.name.label("loc_name")).outerjoin(
        LocationNode, AssetModel.location_node_id == LocationNode.id
    ).filter(AssetModel.deleted_at == None)
    
    if location_node_id:
        query = query.filter(AssetModel.location_node_id == location_node_id)
    if not show_decommissioned:
        query = query.filter(AssetModel.status != "decommissioned")
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (AssetModel.hostname.ilike(search_filter)) |
            (AssetModel.ip_address.ilike(search_filter)) |
            (AssetModel.mac_address.ilike(search_filter))
        )
        
    result = await db.execute(query.offset(skip).limit(limit))
    rows = result.all()
    
    assets = []
    for row in rows:
        a = row[0]
        assets.append({
            "id": str(a.id), 
            "hostname": a.hostname, 
            "ip_address": a.ip_address or "---",
            "mac_address": a.mac_address or "---", 
            "status": a.status,
            "criticality": a.criticality or "medium", 
            "av_product": a.av_product or "Sin Protección",
            "location_name": row.loc_name or "Sin Ubicación",
            "os_name": a.os_name or "Desconocido", 
            "os_version": a.os_version or "---", 
            "last_seen": str(a.last_seen) if a.last_seen else None
        })
    return assets

@router.get("/{asset_id}", response_model=Any)
async def read_asset(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from app.db.models.asset import Asset as AssetModel
    from app.db.models.location import LocationNode
    
    query = sa_select(AssetModel, LocationNode.name.label("loc_name")).outerjoin(
        LocationNode, AssetModel.location_node_id == LocationNode.id
    ).where(AssetModel.id == asset_id)
    
    result = await db.execute(query)
    row = result.first()
    if not row: raise HTTPException(status_code=404, detail="Asset not found")
    
    a = row[0]
    return {
        "id": str(a.id), "hostname": a.hostname, "serial": a.serial or "N/A",
        "asset_tag": a.asset_tag or "N/A", "mac_address": a.mac_address or "---",
        "ip_address": a.ip_address or "---", "status": a.status or "operative",
        "criticality": a.criticality or "medium", "av_product": a.av_product or "Sin Protección",
        "os_name": a.os_name or "Desconocido", "os_version": a.os_version or "---",
        "last_seen": str(a.last_seen) if a.last_seen else None,
        "location_name": row.loc_name or "Sin Ubicación",
        "location_history": [], "install_records": [], "ip_history": []
    }

@router.post("/import", response_model=ImportResult)
async def import_assets(
    *,
    db: AsyncSession = Depends(get_db),
    assets_in: List[Dict[str, Any]] = Body(...),
    source: str = Query("auto", description="Source system: 'fortiems', 'eset', or 'auto'"),
    current_user: User = Depends(get_current_active_user)
):
    from app.services.asset_import_service import process_fortiems_import, process_eset_import, ImportResult as SrvImportResult
    from app.db.models.asset import Asset as AssetModel
    from app.crud.crud_location import location as crud_location

    if not assets_in:
        return ImportResult(success_count=0, updated_count=0, error_count=0, errors=[])

    print(f"DEBUG IMPORT: Received {len(assets_in)} items. First item keys: {list(assets_in[0].keys())}")

    # 1. Auto-detection logic if needed
    if source == "auto":
        # Check first item to guess
        first_keys = {str(k).lower().strip().lstrip('\ufeff') for k in assets_in[0].keys()}
        if "group_paths" in first_keys:
            source = "fortiems"
        elif "grupo" in first_keys and "usuarios registrados" in first_keys:
            source = "eset"
        else:
            source = "manual"

    # 2. Dispatch to service
    if source == "fortiems":
        res_obj = await process_fortiems_import(db, assets_in)
        return res_obj.dict()
    elif source == "eset":
        res_obj = await process_eset_import(db, assets_in)
        return res_obj.dict()
    
    # 3. Fallback / Manual Logic (Preserved/Simplified here for non-specific imports)
    res = ImportResult(success_count=0, updated_count=0, error_count=0, errors=[])
    manual_loc_id = await crud_location.get_or_create_by_path(db, "PFA/Importaciones Manuales")
    
    for idx, raw_item in enumerate(assets_in):
        try:
            item = {str(k).lower().strip(): str(v).strip() for k, v in raw_item.items()}
            hostname = item.get("host") or item.get("name") or item.get("nombre") or item.get("hostname")
            if not hostname: continue
            
            ip = item.get("ip_addr") or item.get("ip_address") or item.get("direcciones ip")
            if ip: ip = str(ip).split(",")[0].strip()
            
            query_asset = sa_select(AssetModel).filter(and_(AssetModel.hostname == hostname, AssetModel.ip_address == (ip if ip else None)))
            asset_db = await db.execute(query_asset)
            existing_asset = asset_db.scalar_one_or_none()

            if existing_asset:
                existing_asset.last_seen = datetime.now()
                # Update basic fields if provided
                if item.get("os"): existing_asset.os_name = item.get("os")
                res.updated_count += 1
            else:
                new_asset = AssetModel(
                    hostname=hostname,
                    ip_address=ip,
                    location_node_id=manual_loc_id,
                    status="operative",
                    source_system="Manual",
                    av_product="Sin Protección",
                    last_seen=datetime.now()
                )
                db.add(new_asset)
                res.success_count += 1
            
            if (res.success_count + res.updated_count) % 50 == 0: await db.flush()
        except Exception as e:
            res.error_count += 1
            res.errors.append({"row": idx + 1, "msg": str(e)})

    await db.commit()
    return res

@router.post("/install", response_model=Any)
async def install_asset(*, db: AsyncSession = Depends(get_db), request_payload: AssetInstallRequest, current_user: User = Depends(get_current_active_user)):
    from app.db.models.asset import Asset as AssetModel
    asset = await crud_asset.process_installation(db, asset_data=request_payload.asset_data, install_data=request_payload.install_data, user_id=current_user.id)
    return {"status": "ok", "id": str(asset.id)}

@router.delete("/{asset_id}")
async def delete_asset(asset_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    asset_obj = await crud_asset.get(db, id=asset_id)
    if not asset_obj: raise HTTPException(status_code=404, detail="Asset not found")
    await crud_asset.remove(db, id=asset_id)
    return {"status": "success"}

@router.put("/{asset_id}", response_model=Any)
async def update_asset(*, db: AsyncSession = Depends(get_db), asset_id: UUID, asset_in: AssetUpdate, current_user: User = Depends(get_current_active_user)):
    asset_obj = await crud_asset.get(db, id=asset_id)
    if not asset_obj: raise HTTPException(status_code=404, detail="Asset not found")
    return await crud_asset.update(db, db_obj=asset_obj, obj_in=asset_in, user_id=current_user.id)

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user
from app.schemas.asset import Asset, AssetCreate, AssetUpdate, AssetInstallRecordCreate, AssetWithDetails
from sqlalchemy.orm import selectinload
from sqlalchemy.future import select as sa_select
from app.crud.crud_asset import asset as crud_asset
from app.db.models.user import User

router = APIRouter()

@router.get("", response_model=List[Asset])
async def read_assets(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    location_node_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve assets.
    """
    return await crud_asset.get_multi(db, skip=skip, limit=limit, location_node_id=location_node_id)

@router.get("/{asset_id}", response_model=AssetWithDetails)
async def read_asset(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get asset by ID with full history.
    """
    from app.db.models.asset import Asset as AssetModel
    query = sa_select(AssetModel).filter(AssetModel.id == asset_id).options(
        selectinload(AssetModel.location_history),
        selectinload(AssetModel.install_records),
        selectinload(AssetModel.ip_history)
    )
    result = await db.execute(query)
    asset_obj = result.scalar_one_or_none()
    
    if not asset_obj:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset_obj

@router.post("", response_model=Asset)
async def create_asset(
    *,
    db: AsyncSession = Depends(get_db),
    asset_in: AssetCreate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Create new asset.
    """
    return await crud_asset.create(db, obj_in=asset_in)

@router.post("/install", response_model=Asset)
async def install_asset(
    *,
    db: AsyncSession = Depends(get_db),
    asset_data: AssetCreate,
    install_data: AssetInstallRecordCreate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Process Asset Installation (Form Submission).
    Deduplicates asset and creates install record.
    """
    try:
        asset_obj = await crud_asset.process_installation(
            db, 
            asset_data=asset_data, 
            install_data=install_data, 
            user_id=current_user.id
        )
        # Forzamos la carga de datos para Pydantic
        return Asset.model_validate(asset_obj)
    except Exception as e:
        import logging
        logging.error(f"Error installing asset: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error interno durante la instalación: {str(e)}"
        )

@router.delete("/{asset_id}", response_model=Asset)
async def delete_asset(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Logical delete of an asset.
    """
    asset_obj = await crud_asset.remove(db, id=asset_id)
    if not asset_obj:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset_obj

@router.post("/bulk-delete")
async def bulk_delete_assets(
    *,
    db: AsyncSession = Depends(get_db),
    asset_ids: List[UUID] = Body(...),
    current_user: User = Depends(get_current_active_user)
):
    """
    Logical delete of multiple assets.
    """
    count = 0
    for aid in asset_ids:
        asset_obj = await crud_asset.remove(db, id=aid)
        if asset_obj:
            count += 1
    return {"status": "ok", "deleted_count": count}

@router.put("/{asset_id}", response_model=Asset)
async def update_asset(
    *,
    db: AsyncSession = Depends(get_db),
    asset_id: UUID,
    asset_in: AssetUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Update an asset.
    """
    asset_obj = await crud_asset.get(db, id=asset_id)
    if not asset_obj:
        raise HTTPException(status_code=404, detail="Asset not found")
    return await crud_asset.update(db, db_obj=asset_obj, obj_in=asset_in, user_id=current_user.id)

@router.put("/{asset_id}/move", response_model=Asset)
async def move_asset(
    *,
    db: AsyncSession = Depends(get_db),
    asset_id: UUID,
    new_location_id: UUID = Body(..., embed=True),
    reason: str = Body(None, embed=True),
    current_user: User = Depends(get_current_active_user)
):
    """
    Move asset to a new location (Drag & Drop).
    """
    asset_obj = await crud_asset.get(db, id=asset_id)
    if not asset_obj:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    update_data = AssetUpdate(location_node_id=new_location_id)
    return await crud_asset.update(db, db_obj=asset_obj, obj_in=update_data, user_id=current_user.id)

@router.post("/bulk-move")
async def bulk_move_assets(
    *,
    db: AsyncSession = Depends(get_db),
    asset_ids: List[UUID] = Body(...),
    new_location_id: UUID = Body(...),
    current_user: User = Depends(get_current_active_user)
):
    """
    Move multiple assets to a new location.
    """
    for aid in asset_ids:
        asset_obj = await crud_asset.get(db, id=aid)
        if asset_obj:
            update_data = AssetUpdate(location_node_id=new_location_id)
            await crud_asset.update(db, db_obj=asset_obj, obj_in=update_data, user_id=current_user.id)
    return {"status": "ok", "moved_count": len(asset_ids)}

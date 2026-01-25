from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user
from app.schemas.location import LocationNode, LocationNodeCreate, LocationNodeUpdate
from app.crud.crud_location import location as crud_location
from app.db.models.user import User

router = APIRouter()

@router.get("", response_model=List[LocationNode])
async def read_locations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve all locations.
    """
    return await crud_location.get_all(db)

@router.post("", response_model=LocationNode)
async def create_location(
    *,
    db: AsyncSession = Depends(get_db),
    location_in: LocationNodeCreate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Create new location node.
    """
    return await crud_location.create(db, obj_in=location_in)

@router.put("/{location_id}", response_model=LocationNode)
async def update_location(
    *,
    db: AsyncSession = Depends(get_db),
    location_id: UUID,
    location_in: LocationNodeUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a location node.
    """
    loc = await crud_location.get(db, id=location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return await crud_location.update(db, db_obj=loc, obj_in=location_in)

@router.delete("/{location_id}", response_model=LocationNode)
async def delete_location(
    *,
    db: AsyncSession = Depends(get_db),
    location_id: UUID,
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a location node.
    """
    loc = await crud_location.get(db, id=location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    # Add check for children or assets before delete?
    return await crud_location.delete(db, id=location_id)

from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.api.deps import get_db, get_current_active_user
from app.crud import crud_endpoint, crud_audit
from app.db.models import User
from app.schemas.endpoint import Endpoint, EndpointCreate, EndpointUpdate

from app.services.group_service import group_service

router = APIRouter()

@router.get("", response_model=List[Endpoint])
async def read_endpoints(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    skip: int = 0,
    limit: int = 100,
):
    """
    Retrieve endpoints with hierarchical filtering.
    """
    if current_user.is_superuser:
        # Superuser sees everything
        endpoints = await crud_endpoint.endpoint.get_multi(
            db, skip=skip, limit=limit
        )
    else:
        # Get all child group IDs including current group
        if not current_user.group_id:
            return []
        group_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
        
        # We need to modify get_multi to accept a list of group_ids
        from sqlalchemy.future import select
        from app.db.models.endpoint import Endpoint as EndpointModel
        
        query = select(EndpointModel).filter(
            EndpointModel.deleted_at == None,
            EndpointModel.group_id.in_(group_ids)
        )
        result = await db.execute(query.offset(skip).limit(limit))
        endpoints = result.scalars().all()
        
    return endpoints

@router.post("", response_model=Endpoint, status_code=status.HTTP_201_CREATED)
async def create_endpoint(
    request: Request,
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    endpoint_in: EndpointCreate
):
    """
    Create new endpoint.
    """
    endpoint = await crud_endpoint.endpoint.create(db, obj_in=endpoint_in)
    
    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="endpoint_created",
        ip_address=request.client.host,
        details={"endpoint_id": str(endpoint.id), "hostname": endpoint.hostname}
    )
    return endpoint

@router.get("/{endpoint_id}", response_model=Endpoint)
async def read_endpoint(
    endpoint_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Get endpoint by ID.
    """
    endpoint = await crud_endpoint.endpoint.get(db, id=endpoint_id)
    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    
    # Check access
    if not current_user.is_superuser:
        if not current_user.group_id:
            raise HTTPException(status_code=403, detail="User not assigned to any group")
        group_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
        if endpoint.group_id not in group_ids:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
    return endpoint

@router.put("/{endpoint_id}", response_model=Endpoint)
async def update_endpoint(
    request: Request,
    endpoint_id: UUID,
    endpoint_in: EndpointUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Update an endpoint.
    """
    endpoint = await crud_endpoint.endpoint.get(db, id=endpoint_id)
    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found")
        
    if not current_user.is_superuser and endpoint.group_id != current_user.group_id:
         raise HTTPException(status_code=403, detail="Not enough permissions")

    updated_endpoint = await crud_endpoint.endpoint.update(db, db_obj=endpoint, obj_in=endpoint_in)
    
    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="endpoint_updated",
        ip_address=request.client.host,
        details={"endpoint_id": str(endpoint.id)}
    )
    return updated_endpoint

@router.delete("/{endpoint_id}", response_model=Endpoint)
async def delete_endpoint(
    request: Request,
    endpoint_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Delete an endpoint.
    """
    endpoint = await crud_endpoint.endpoint.get(db, id=endpoint_id)
    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found")
        
    if not current_user.is_superuser and endpoint.group_id != current_user.group_id:
         raise HTTPException(status_code=403, detail="Not enough permissions")

    deleted_endpoint = await crud_endpoint.endpoint.remove(db, id=endpoint_id)
    
    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="endpoint_deleted",
        ip_address=request.client.host,
        details={"endpoint_id": str(endpoint_id)}
    )
    return deleted_endpoint

from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.api.deps import get_db, require_permission, require_endpoint_permission # Updated imports
from app.crud import crud_endpoint, crud_audit
from app.db.models import User
from app.schemas.endpoint import Endpoint, EndpointCreate, EndpointUpdate
from app.services.group_service import group_service
from app.db.models.endpoint import Endpoint as EndpointModel # Import EndpointModel
router = APIRouter()
@router.get("", response_model=List[Endpoint])
async def read_endpoints(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("endpoints:read:all"))], # Added permission
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
    endpoint_in: EndpointCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("endpoints:create"))], # Added permission
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
    endpoint: Annotated[EndpointModel, Depends(require_endpoint_permission("read"))], # New dependency
):
    """
    Get endpoint by ID.
    """
    return endpoint
@router.put("/{endpoint_id}", response_model=Endpoint)
async def update_endpoint(
    request: Request,
    endpoint_in: EndpointUpdate,
    endpoint: Annotated[EndpointModel, Depends(require_endpoint_permission("update"))], # New dependency
    db: Annotated[AsyncSession, Depends(get_db)], # Keep for audit log and crud operation
    current_user: Annotated[User, Depends(require_permission("endpoints:update"))], # Keep for audit log
):
    """
    Update an endpoint.
    """
    # Removed internal access check
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
    endpoint: Annotated[EndpointModel, Depends(require_endpoint_permission("delete"))], # New dependency
    db: Annotated[AsyncSession, Depends(get_db)], # Keep for crud operation
    current_user: Annotated[User, Depends(require_permission("endpoints:delete"))], # Keep for audit log
):
    """
    Delete an endpoint.
    """
    # Removed internal access check
    deleted_endpoint = await crud_endpoint.endpoint.remove(db, id=endpoint.id) # Use endpoint.id
    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="endpoint_deleted",
        ip_address=request.client.host,
        details={"endpoint_id": str(endpoint.id)}
    )
    return deleted_endpoint
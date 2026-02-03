from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

from app.api.deps import get_db, require_permission, require_role
from app.db.models import User, SLAPolicy
from app.schemas.sla import SLAPolicy as SLAPolicySchema, SLAPolicyCreate, SLAPolicyUpdate

router = APIRouter()

@router.get(
    "/",
    response_model=List[SLAPolicySchema],
    dependencies=[Depends(require_role(['owner', 'admin', 'analyst', 'tech', 'viewer']))]
)
async def read_sla_policies(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("sla:read:all"))],
):
    """
    Retrieve SLA policies.
    """
    result = await db.execute(select(SLAPolicy))
    return result.scalars().all()

@router.post(
    "/",
    response_model=SLAPolicySchema,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(['owner', 'admin']))]
)
async def create_sla_policy(
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("sla:manage"))],
    policy_in: SLAPolicyCreate
):
    """
    Create new SLA policy. Only superusers.
    """
    db_obj = SLAPolicy(**policy_in.model_dump())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.put(
    "/{policy_id}",
    response_model=SLAPolicySchema,
    dependencies=[Depends(require_role(['owner', 'admin']))]
)
async def update_sla_policy(
    policy_id: UUID,
    policy_in: SLAPolicyUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("sla:manage"))],
):
    """
    Update an SLA policy. Only superusers.
    """
    result = await db.execute(select(SLAPolicy).filter(SLAPolicy.id == policy_id))
    db_obj = result.scalar_one_or_none()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Policy not found")
        
    for var, value in policy_in.model_dump(exclude_unset=True).items():
        setattr(db_obj, var, value)
        
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.delete(
    "/{policy_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(['owner', 'admin']))]
)
async def delete_sla_policy(
    policy_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("sla:manage"))],
):
    """
    Delete an SLA policy. Only superusers.
    """
    result = await db.execute(select(SLAPolicy).filter(SLAPolicy.id == policy_id))
    db_obj = result.scalar_one_or_none()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Policy not found")
        
    await db.delete(db_obj)
    await db.commit()
    return None
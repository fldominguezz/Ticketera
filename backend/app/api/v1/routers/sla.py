from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

from app.api.deps import get_db, get_current_active_user
from app.db.models import User, SLAPolicy
from app.schemas.sla import SLAPolicy as SLAPolicySchema, SLAPolicyCreate, SLAPolicyUpdate

router = APIRouter()

@router.get("/", response_model=List[SLAPolicySchema])
async def read_sla_policies(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Retrieve SLA policies.
    """
    result = await db.execute(select(SLAPolicy))
    return result.scalars().all()

@router.post("/", response_model=SLAPolicySchema, status_code=status.HTTP_201_CREATED)
async def create_sla_policy(
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    policy_in: SLAPolicyCreate
):
    """
    Create new SLA policy. Only superusers.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    db_obj = SLAPolicy(**policy_in.model_dump())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.put("/{policy_id}", response_model=SLAPolicySchema)
async def update_sla_policy(
    policy_id: UUID,
    policy_in: SLAPolicyUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Update an SLA policy. Only superusers.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
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

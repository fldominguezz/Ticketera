from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api.deps import get_db, require_permission
from app.db import models
from app.schemas.admin_configs import PasswordPolicy, PasswordPolicyUpdate, TicketType, TicketTypeCreate
router = APIRouter()
# --- PASSWORD POLICY ---
@router.get("/password-policy", response_model=PasswordPolicy)
async def get_password_policy(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[models.User, Depends(require_permission("admin:settings:read"))]
):
    res = await db.execute(select(models.PasswordPolicy).limit(1))
    policy = res.scalar_one_or_none()
    if not policy:
        # Create a default policy if none exists
        policy = models.PasswordPolicy(
            min_length=12,
            requires_uppercase=True,
            requires_lowercase=True,
            requires_number=True,
            requires_special_char=True,
            enforce_2fa_all=False
        )
        db.add(policy)
        await db.commit()
        await db.refresh(policy)
    return policy
@router.put("/password-policy", response_model=PasswordPolicy)
async def update_password_policy(
    policy_in: PasswordPolicyUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[models.User, Depends(require_permission("admin:settings:manage"))]
):
    res = await db.execute(select(models.PasswordPolicy).limit(1))
    policy = res.scalar_one_or_none()
    if not policy:
        policy = models.PasswordPolicy()
        db.add(policy)
    for field, value in policy_in.model_dump().items():
        setattr(policy, field, value)
    await db.commit()
    await db.refresh(policy)
    return policy
# --- TICKET TYPES ---
@router.get("/ticket-types", response_model=List[TicketType])
async def list_ticket_types(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[models.User, Depends(require_permission("admin:catalogs:read"))]
):
    res = await db.execute(select(models.TicketType))
    return res.scalars().all()
@router.post("/ticket-types", response_model=TicketType)
async def create_ticket_type(
    type_in: TicketTypeCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[models.User, Depends(require_permission("admin:catalogs:manage"))]
):
    db_obj = models.TicketType(**type_in.model_dump())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj
from typing import Annotated, List, Any
import string
from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_current_active_user, get_current_superuser
from app.crud import crud_user, crud_iam, crud_audit
from app.schemas.user import UserCreate, User as UserSchema
from app.schemas.iam import Role as RoleSchema, RoleCreate, UserRoleAssignment
from app.schemas.user_security import ChangePasswordRequest, Disable2FARequest
from app.schemas.auth import TotpSetupResponse, TotpRequest
from app.core.security import (
    get_password_hash, 
    verify_password, 
    generate_totp_secret, 
    get_totp_provisioning_uri, 
    verify_totp, 
    generate_recovery_codes
)
from app.db.models import User, Group, PasswordPolicy
from app.db.models.iam import UserRole, Role, RolePermission

router = APIRouter()

@router.post("", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    db_user = await crud_user.get_by_email(db, email=user_in.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = await crud_user.create(db, user_in)
    
    # Reload with relationships and permissions
    result = await db.execute(
        select(User).where(User.id == user.id)
        .options(
            selectinload(User.roles)
            .selectinload(UserRole.role)
            .selectinload(Role.permissions)
            .selectinload(RolePermission.permission), 
            selectinload(User.group)
        )
    )
    return result.scalar_one()

@router.get("", response_model=List[UserSchema])
async def read_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    skip: int = 0,
    limit: int = 100,
):
    query = (
        select(User)
        .options(
            selectinload(User.roles)
            .selectinload(UserRole.role)
            .selectinload(Role.permissions)
            .selectinload(RolePermission.permission), 
            selectinload(User.group)
        )
        .offset(skip).limit(limit)
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/me", response_model=UserSchema)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> Any:
    return current_user

@router.post("/me/change-password")
async def change_my_password(
    request: Request,
    password_data: ChangePasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    # Password Policy Validation
    res = await db.execute(select(PasswordPolicy).limit(1))
    policy = res.scalar_one_or_none()

    if policy:
        p = password_data.new_password
        if len(p) < policy.min_length:
            raise HTTPException(status_code=400, detail=f"Password too short (min {policy.min_length} characters)")
        if policy.requires_uppercase and not any(c.isupper() for c in p):
            raise HTTPException(status_code=400, detail="Password requires at least one uppercase letter")
        if policy.requires_lowercase and not any(c.islower() for c in p):
            raise HTTPException(status_code=400, detail="Password requires at least one lowercase letter")
        if policy.requires_number and not any(c.isdigit() for c in p):
            raise HTTPException(status_code=400, detail="Password requires at least one number")
        if policy.requires_special_char and not any(c in string.punctuation for c in p):
            raise HTTPException(status_code=400, detail="Password requires at least one special character")

    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.add(current_user)
    await db.commit()
    return {"message": "Success"}

@router.post("/me/2fa/setup", response_model=TotpSetupResponse)
async def setup_2fa(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Generate TOTP secret and provisioning URI for the current user.
    """
    secret = generate_totp_secret()
    provisioning_uri = get_totp_provisioning_uri(current_user.email, secret)
    recovery_codes = generate_recovery_codes()
    
    # Temporarily store secret in user object (not yet enabled)
    current_user.totp_secret = secret
    db.add(current_user)
    await db.commit()
    
    return TotpSetupResponse(
        secret=secret,
        provisioning_uri=provisioning_uri,
        recovery_codes=recovery_codes
    )

@router.post("/me/2fa/enable")
async def enable_2fa(
    totp_data: TotpRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Verify TOTP code and enable 2FA for the current user.
    """
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA setup not initiated")
        
    if not verify_totp(current_user.totp_secret, totp_data.totp_code):
        raise HTTPException(status_code=400, detail="Invalid verification code")
        
    current_user.is_2fa_enabled = True
    db.add(current_user)
    await db.commit()
    return {"message": "2FA enabled successfully"}

@router.post("/me/2fa/disable")
async def disable_2fa(
    disable_data: Disable2FARequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Disable 2FA for the current user.
    """
    if not verify_password(disable_data.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")
        
    current_user.is_2fa_enabled = False
    current_user.totp_secret = None
    db.add(current_user)
    await db.commit()
    return {"message": "2FA disabled successfully"}

from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from uuid import UUID

from app.schemas.user import User as UserSchema, UserCreate, UserUpdate
from app.crud.crud_user import user as crud_user
from app.api.deps import get_db, get_current_superuser
from app.db.models import User
from app.db.models.iam import UserRole, Role, RolePermission
from app.crud import crud_audit
from fastapi import Request

router = APIRouter()

from app.db.models.group import Group

@router.get("", response_model=List[UserSchema])
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_superuser)],
    skip: int = 0,
    limit: int = 100,
):
    """
    List all users. (Superuser only)
    """
    query = (
        select(User)
        .options(
            selectinload(User.roles)
            .selectinload(UserRole.role)
            .selectinload(Role.permissions)
            .selectinload(RolePermission.permission),
            selectinload(User.group)
        )
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def create_user_admin(
    request: Request,
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_superuser)],
):
    """
    Create a new user from admin panel.
    """
    db_user = await crud_user.get_by_email(db, email=user_in.email)
    if db_user:
        raise HTTPException(status_code=400, detail="The user with this email already exists.")
    
    db_user = await crud_user.get_by_username(db, username=user_in.username)
    if db_user:
        raise HTTPException(status_code=400, detail="The user with this username already exists.")

    new_user = await crud_user.create(db, obj_in=user_in)
    
    # Load roles and group for response
    result = await db.execute(
        select(User)
        .where(User.id == new_user.id)
        .options(
            selectinload(User.roles)
            .selectinload(UserRole.role)
            .selectinload(Role.permissions)
            .selectinload(RolePermission.permission),
            selectinload(User.group)
        )
    )
    new_user = result.scalar_one()

    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="admin_user_created",
        ip_address=request.client.host,
        details={"created_user_id": str(new_user.id), "username": new_user.username}
    )
    return new_user

@router.put("/{user_id}", response_model=UserSchema)
async def update_user_admin(
    request: Request,
    user_id: UUID,
    user_in: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_superuser)],
):
    """
    Update a user from admin panel.
    """
    db_user = await crud_user.get(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_user = await crud_user.update(db, db_obj=db_user, obj_in=user_in)
    
    # Load roles and group for response
    result = await db.execute(
        select(User)
        .where(User.id == updated_user.id)
        .options(
            selectinload(User.roles)
            .selectinload(UserRole.role)
            .selectinload(Role.permissions)
            .selectinload(RolePermission.permission),
            selectinload(User.group)
        )
    )
    updated_user = result.scalar_one()

    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="admin_user_updated",
        ip_address=request.client.host,
        details={"updated_user_id": str(user_id)}
    )
    return updated_user

@router.delete("/{user_id}")
async def delete_user_admin(
    request: Request,
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_superuser)],
):
    """
    Delete (deactivate) a user.
    """
    db_user = await crud_user.get(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db_user.is_active = False
    db.add(db_user)
    await db.commit()
    
    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="admin_user_deactivated",
        ip_address=request.client.host,
        details={"deactivated_user_id": str(user_id)}
    )
    return {"status": "success", "detail": "User deactivated"}

@router.post("/{user_id}/reset-password")
async def reset_password_admin(
    request: Request,
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_superuser)],
):
    db_user = await crud_user.get(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_password = crud_user.generate_random_password()
    from app.core.security import get_password_hash
    db_user.hashed_password = get_password_hash(new_password)
    db_user.force_password_change = True
    db.add(db_user)
    await db.commit()
    
    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="admin_password_reset",
        ip_address=request.client.host,
        details={"reset_user_id": str(user_id)}
    )
    return {"status": "success", "new_password": new_password}

@router.post("/{user_id}/reset-2fa")
async def reset_2fa_admin(
    request: Request,
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_superuser)],
):
    db_user = await crud_user.get(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.reset_2fa_next_login = True
    db.add(db_user)
    await db.commit()
    
    return {"status": "success", "detail": "User will be forced to reset 2FA on next login"}

@router.post("/{user_id}/disable-2fa")
async def disable_2fa_admin(
    request: Request,
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_superuser)],
):
    db_user = await crud_user.get(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.is_2fa_enabled = False
    db_user.totp_secret = None
    db.add(db_user)
    await db.commit()
    
    return {"status": "success", "detail": "2FA disabled for user"}

@router.post("/{user_id}/force-password-change")
async def force_password_change_admin(
    request: Request,
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_superuser)],
):
    db_user = await crud_user.get(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.force_password_change = True
    db.add(db_user)
    await db.commit()
    
    return {"status": "success", "detail": "User will be forced to change password on next login"}

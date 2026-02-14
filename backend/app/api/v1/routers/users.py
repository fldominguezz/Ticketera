from app.utils.security import safe_join, sanitize_filename
from typing import Annotated, List, Any
import string
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_current_active_user, require_permission, get_current_user
from app.crud import crud_user, crud_iam, crud_audit
from app.schemas.user import UserCreate, User as UserSchema, UserUpdate
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

from fastapi import APIRouter, Depends, HTTPException, status, Request, Body, File, UploadFile
import os
import shutil

router = APIRouter()

@router.post("/me/avatar", response_model=UserSchema)
async def update_user_avatar(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    file: UploadFile = File(...)
):
    """
    Upload and update user's profile picture.
    """
    # Validar extensión
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only images allowed.")

    # Guardar archivo
    upload_dir = "/app/uploads/avatars"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir, exist_ok=True)
        
    filename = f"{current_user.id}{ext}"
    file_path = safe_join(upload_dir, sanitize_filename(filename))
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Actualizar DB
    avatar_url = f"/uploads/avatars/{filename}"
    current_user.avatar_url = avatar_url
    db.add(current_user)
    await db.commit()
    
    return current_user

@router.delete("/me/avatar", response_model=UserSchema)
async def delete_user_avatar(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    """
    Remove user's profile picture.
    """
    current_user.avatar_url = None
    db.add(current_user)
    await db.commit()
    return current_user

@router.post(
    "",
    response_model=UserSchema,
    status_code=status.HTTP_201_CREATED
)
async def create_user(
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:users:manage"))]
) -> Any:
    db_user = await crud_user.user.get_by_email(db, email=user_in.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    try:
        user = await crud_user.user.create(db, user_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
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

@router.get(
    "",
    response_model=List[UserSchema]
)
async def read_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    skip: int = 0,
    limit: int = 100,
):
    # Permission Check: Admin OR Ticket Creator (for mentions)
    if not current_user.is_superuser and \
       not current_user.has_permission("admin:users:read") and \
       not current_user.has_permission("ticket:create"):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    query = (
        select(User)
        .options(
            selectinload(User.roles)
            .selectinload(UserRole.role)
            .selectinload(Role.permissions)
            .selectinload(RolePermission.permission), 
            selectinload(User.group)
        )
        .filter(User.username.notin_(['admin']))
        .offset(skip).limit(limit)
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/me", response_model=UserSchema)
async def read_user_me(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    # Recargar al usuario con todos los permisos y grupos para asegurar que el frontend reciba todo
    result = await db.execute(
        select(User).where(User.id == current_user.id)
        .options(
            selectinload(User.roles)
            .selectinload(UserRole.role)
            .selectinload(Role.permissions)
            .selectinload(RolePermission.permission), 
            selectinload(User.group)
        )
    )
    return result.scalar_one()

@router.put("/me", response_model=UserSchema)
async def update_user_me(
    request: Request,
    user_in: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Update current user's profile.
    """
    # Prevent changing roles or group via this endpoint
    user_in.role_ids = None
    user_in.group_id = None
    user_in.is_superuser = None
    user_in.is_active = None

    updated_user = await crud_user.user.update(db, db_obj=current_user, obj_in=user_in)
    
    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="user_profile_updated",
        ip_address=request.client.host,
        details={
            "changes": user_in.model_dump(exclude_unset=True, exclude={'password'})
        }
    )
    return updated_user

@router.put("/me/dashboard-layout")
async def update_my_dashboard_layout(
    layout: List[dict],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Save the custom dashboard layout for the current user.
    """
    current_user.dashboard_layout = layout
    db.add(current_user)
    await db.commit()
    return {"status": "success", "layout": layout}

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

    # SINCRO CON WIKI
    try:
        await crud_user.user.sync_to_wiki(current_user, action="update", plain_password=password_data.new_password)
    except Exception as e:
        pass
    pass
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

    from app.services.notification_service import notification_service
    await notification_service.notify_user(
        db, user_id=current_user.id,
        title="🔐 Seguridad: 2FA Activado",
        message="Has activado correctamente la autenticación de dos factores.",
        link="/profile"
    )
    
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

    from app.services.notification_service import notification_service
    await notification_service.notify_user(
        db, user_id=current_user.id,
        title="⚠️ Seguridad: 2FA Desactivado",
        message="Se ha desactivado la autenticación de dos factores en tu cuenta.",
        link="/profile"
    )

    return {"message": "2FA disabled successfully"}

@router.get(
    "/{user_id}",
    response_model=UserSchema
)
async def read_user_admin(
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:users:read"))],
):
    """
    Get a specific user by ID.
    """
    result = await db.execute(
        select(User).where(User.id == user_id)
        .options(
            selectinload(User.roles)
            .selectinload(UserRole.role)
            .selectinload(Role.permissions)
            .selectinload(RolePermission.permission), 
            selectinload(User.group)
        )
    )
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

# --- Administrative Operations (RBAC Protected) ---

@router.put(
    "/{user_id}", 
    response_model=UserSchema
)
async def update_user_admin(
    request: Request,
    user_id: UUID,
    user_in: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:users:manage"))],
):
    """
    Update a user from admin panel.
    """
    db_user = await crud_user.user.get(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_user = await crud_user.user.update(db, db_obj=db_user, obj_in=user_in)
    
    # Load roles and group for response
    result = await db.execute(
        select(User)
        .where(User.id == updated_user.id)
        .options(
            selectinload(User.roles).selectinload(UserRole.role).selectinload(Role.permissions).selectinload(RolePermission.permission),
            selectinload(User.group)
        )
    )
    updated_user = result.scalar_one()

    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="admin_user_updated",
        ip_address=request.client.host,
        details={
            "updated_user_id": str(user_id),
            "updated_username": updated_user.username,
            "changes": user_in.model_dump(exclude_unset=True, exclude={'password'})
        }
    )
    return updated_user

@router.delete(
    "/{user_id}"
)
async def delete_user_admin(
    request: Request,
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:users:manage"))],
):
    """
    Delete (deactivate) a user.
    """
    db_user = await crud_user.user.get(db, user_id=user_id)
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

@router.post(
    "/{user_id}/reset-password"
)
async def reset_password_admin(
    request: Request,
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:users:manage"))],
):
    db_user = await crud_user.user.get(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_password = crud_user.user.generate_random_password()
    db_user.hashed_password = get_password_hash(new_password)
    db_user.force_password_change = True
    db.add(db_user)
    await db.commit()

    # SINCRO CON WIKI
    try:
        await crud_user.user.sync_to_wiki(db_user, action="update", plain_password=new_password)
    except Exception as e:
        pass
    pass
    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="admin_password_reset",
        ip_address=request.client.host,
        details={"reset_user_id": str(user_id)}
    )
    return {"status": "success", "new_password": new_password}

@router.post(
    "/{user_id}/reset-2fa"
)
async def reset_2fa_admin(
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:users:manage"))],
):
    db_user = await crud_user.user.get(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.reset_2fa_next_login = True
    db.add(db_user)
    await db.commit()
    
    return {"status": "success", "detail": "User will be forced to reset 2FA on next login"}

@router.post(
    "/{user_id}/disable-2fa"
)
async def disable_2fa_admin(
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:users:manage"))],
):
    db_user = await crud_user.user.get(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.is_2fa_enabled = False
    db_user.totp_secret = None
    db.add(db_user)
    await db.commit()
    
    return {"status": "success", "detail": "2FA disabled for user"}

@router.post(
    "/{user_id}/force-password-change"
)
async def force_password_change_admin(
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:users:manage"))],
):
    db_user = await crud_user.user.get(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.force_password_change = True
    db.add(db_user)
    await db.commit()
    
    return {"status": "success", "detail": "User will be forced to change password on next login"}

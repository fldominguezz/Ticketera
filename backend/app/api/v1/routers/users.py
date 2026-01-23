from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_db, get_current_active_user, get_current_superuser
from app.crud import crud_user, crud_iam, crud_audit
from app.schemas.user import UserCreate, User as UserSchema # Alias Pydantic User
from app.schemas.iam import Role, RoleCreate, UserRoleAssignment
from app.schemas.user_security import ChangePasswordRequest, Disable2FARequest
from app.schemas.auth import TotpSetupResponse, TotpRequest
from app.core.security import get_password_hash, verify_password, generate_totp_secret, get_totp_provisioning_uri, verify_totp, generate_recovery_codes
from app.db.models import User, Group # Use SQLAlchemy User directly

router = APIRouter()

@router.post("/", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> User: # Return SQLAlchemy User
    """
    Create new user.
    """
    db_user = await crud_user.get_by_email(db, email=user_in.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this email already exists in the system.",
        )
    db_user = await crud_user.get_by_username(db, username=user_in.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this username already exists in the system.",
        )
    
    user = await crud_user.create(db, user_in)
    return user

@router.get("/", response_model=List[UserSchema])
async def read_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    skip: int = 0,
    limit: int = 100,
):
    """
    Retrieve users.
    """
    result = await db.execute(select(User).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/me", response_model=UserSchema)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_active_user)] # SQLAlchemy User
) -> User: # Return SQLAlchemy User
    """
    Get current active user.
    """
    return current_user

@router.get("/me/superuser", response_model=UserSchema)
async def read_users_me_superuser(
    current_user: Annotated[User, Depends(get_current_superuser)] # SQLAlchemy User
) -> User: # Return SQLAlchemy User
    """
    Get current superuser. (Requires superuser privileges)
    """
    return current_user

@router.post("/me/change-password")
async def change_my_password(
    request: Request,
    password_data: ChangePasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)], # SQLAlchemy User
):
    """
    Change the current user's password.
    """
    if not verify_password(password_data.current_password, current_user.hashed_password):
        await crud_audit.audit_log.create_log(
            db,
            user_id=current_user.id,
            event_type="password_change_failed",
            ip_address=request.client.host,
            details={"reason": "incorrect_current_password"},
        )
        raise HTTPException(status_code=400, detail="Incorrect current password")

    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.add(current_user)
    await db.commit()

    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="password_change_success",
        ip_address=request.client.host,
    )
    return {"message": "Password updated successfully"}

@router.post("/me/2fa/setup", response_model=TotpSetupResponse)
async def setup_2fa(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)], # SQLAlchemy User
):
    """
    Initiate 2FA setup for the current user. Generates a TOTP secret and provisioning URI.
    """
    if current_user.is_2fa_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled for this user.")
    
    secret = generate_totp_secret()
    provisioning_uri = get_totp_provisioning_uri(current_user.email, secret)

    # Store the secret temporarily until enabled
    current_user.totp_secret = secret
    # Recovery codes are generated and stored only upon successful 2FA activation
    # For now, we will generate them here but they will only be committed upon /enable
    recovery_codes = generate_recovery_codes() 
    current_user.recovery_codes = recovery_codes

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="2fa_setup_initiate",
        ip_address=request.client.host,
    )
    return TotpSetupResponse(
        secret=secret, provisioning_uri=provisioning_uri, recovery_codes=recovery_codes
    )

@router.post("/me/2fa/enable")
async def enable_2fa(
    request: Request,
    totp_data: TotpRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)], # SQLAlchemy User
):
    """
    Enable 2FA for the current user by verifying a TOTP code.
    """
    if current_user.is_2fa_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled for this user.")
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA setup not initiated.")

    if not verify_totp(current_user.totp_secret, totp_data.totp_code):
        await crud_audit.audit_log.create_log(
            db,
            user_id=current_user.id,
            event_type="2fa_enable_failed",
            ip_address=request.client.host,
            details={"reason": "invalid_totp_code"},
        )
        raise HTTPException(status_code=401, detail="Invalid 2FA code.")

    current_user.is_2fa_enabled = True
    # Recovery codes are already stored from setup, no need to regenerate
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="2fa_enabled",
        ip_address=request.client.host,
    )
    return {"message": "2FA enabled successfully."}

@router.post("/me/2fa/disable")
async def disable_2fa(
    request: Request,
    password_data: Disable2FARequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)], # SQLAlchemy User
):
    """
    Disable 2FA for the current user. Requires password confirmation.
    """
    if not current_user.is_2fa_enabled:
        raise HTTPException(status_code=400, detail="2FA is not enabled for this user.")
    
    if not verify_password(password_data.password, current_user.hashed_password):
        await crud_audit.audit_log.create_log(
            db,
            user_id=current_user.id,
            event_type="2fa_disable_failed",
            ip_address=request.client.host,
            details={"reason": "incorrect_password"},
        )
        raise HTTPException(status_code=401, detail="Incorrect password.")

    current_user.is_2fa_enabled = False
    current_user.totp_secret = None
    current_user.recovery_codes = None # Clear recovery codes as well
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="2fa_disabled",
        ip_address=request.client.host,
    )
    return {"message": "2FA disabled successfully."}

# --- IAM Endpoints ---

@router.post("/roles/", response_model=Role, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_in: RoleCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_superuser)] # SQLAlchemy User
) -> Role:
    """
    Create a new role. (Superuser only)
    """
    role = await crud_iam.iam.get_role_by_name(db, name=role_in.name)
    if role:
        raise HTTPException(
            status_code=400,
            detail="A role with this name already exists",
        )
    role = await crud_iam.iam.create_role(db, name=role_in.name, description=role_in.description)
    return role

@router.post("/users/roles/", response_model=UserRoleAssignment, status_code=status.HTTP_201_CREATED)
async def assign_role_to_user(
    assignment: UserRoleAssignment,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_superuser)] # SQLAlchemy User
) -> UserRoleAssignment:
    """
    Assign a role to a user. (Superuser only)
    """
    user = await crud_user.get(db, user_id=assignment.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Here you would also check if the role exists
    
    await crud_iam.iam.assign_role_to_user(db, user_id=assignment.user_id, role_id=assignment.role_id)
    return assignment

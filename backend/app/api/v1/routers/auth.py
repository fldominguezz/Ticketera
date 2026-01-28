from datetime import timedelta, datetime
from typing import Annotated, Union, Optional, List # Added List

from fastapi import APIRouter, Depends, HTTPException, status, Request, Body # Added Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.limiter import limiter
from app.api import deps
from app.api.deps import get_db, get_current_user, get_crud_user, reusable_oauth2 # Import reusable_oauth2
from app.crud import crud_audit, crud_session
from app.crud.crud_user import user as crud_user_instance # Import the instance directly
from app.schemas.auth import LoginRequest, LoginResponse, TotpRequest, TotpSetupResponse
from app.schemas.token import Token
from app.core.security import (
    create_access_token,
    # authenticate_user, # Removed this
    verify_totp,
    verify_password, # Added this
    get_password_hash,
    generate_totp_secret,
    get_totp_provisioning_uri,
    generate_recovery_codes
)
from app.core.config import settings
from app.db.models import User

router = APIRouter()

# Moved authenticate_user function
async def authenticate_user_local(
    db: AsyncSession, crud_user_dep: crud_user_instance.__class__, identifier: str, password: str
) -> Optional[User]:
    """
    Authenticates a user by username/email and password with account lockout.
    """
    user = await crud_user_dep.get_by_username_or_email(db, identifier=identifier)

    if not user:
        return None
    
    if not user.is_active:
        return None

    # Check if locked
    if user.locked_until and user.locked_until > datetime.now(user.locked_until.tzinfo):
        return None # User is locked

    if not verify_password(password, user.hashed_password):
        # Increment failed attempts
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            user.locked_until = datetime.now(user.created_at.tzinfo) + timedelta(minutes=15)
        db.add(user)
        await db.commit()
        return None

    # Success: reset failed attempts
    if user.failed_login_attempts > 0:
        user.failed_login_attempts = 0
        user.locked_until = None
        db.add(user)
        await db.commit()
        
    return user

@router.post("/login", response_model=Union[LoginResponse, Token])
@limiter.limit("5/minute")
async def login(
    request: Request,
    login_data: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    crud_user: Annotated[crud_user_instance.__class__, Depends(get_crud_user)],
):
    """
    First step of the login process.
    Validates credentials. Handles mandatory changes (password/2FA).
    """
    user = await authenticate_user_local( # Changed to local function
        db, crud_user, identifier=login_data.identifier, password=login_data.password
    )

    if not user:
        await crud_audit.audit_log.create_log(
            db,
            user_id=None, # Explicitly pass user_id as None for failed logins
            event_type="login_failed",
            ip_address=request.client.host,
            details={"identifier": login_data.identifier, "reason": "invalid_credentials"},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    if not user.is_active:
        await crud_audit.audit_log.create_log(
            db,
            user_id=user.id,
            event_type="login_failed",
            ip_address=request.client.host,
            details={"reason": "inactive_user"},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )

    # Check for mandatory changes
    pending_scopes = []
    if user.reset_2fa_next_login or user.enroll_2fa_mandatory:
        pending_scopes.append("2fa:reset")
    if user.force_password_change:
        pending_scopes.append("password:change")

    if pending_scopes:
        interim_token = create_access_token(
            subject=user.id,
            expires_delta=timedelta(minutes=15),
            claims={"scope": " ".join(pending_scopes)},
        )
        return LoginResponse(
            force_password_change=bool(user.force_password_change),
            reset_2fa=bool(user.reset_2fa_next_login or user.enroll_2fa_mandatory),
            interim_token=interim_token
        )

    if user.is_2fa_enabled:
        await crud_audit.audit_log.create_log(
            db, user_id=user.id, event_type="login_success_needs_2fa", ip_address=request.client.host
        )
        interim_token_expires = timedelta(minutes=5)
        interim_token = create_access_token(
            subject=user.id,
            expires_delta=interim_token_expires,
            claims={"scope": "2fa:verify"},
        )
        return LoginResponse(needs_2fa=True, interim_token=interim_token)
    elif user.enroll_2fa_mandatory:
        # Si no tiene 2FA pero es obligatorio enrolarse
        interim_token = create_access_token(
            subject=user.id,
            expires_delta=timedelta(minutes=15),
            claims={"scope": "2fa:reset"},
        )
        return LoginResponse(reset_2fa=True, interim_token=interim_token)
    else:
        await crud_audit.audit_log.create_log(
            db, user_id=user.id, event_type="login_success", ip_address=request.client.host
        )
        # Create the session in the DB
        session = await crud_session.session.create_session(
            db,
            user_id=user.id,
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent")
        )
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        scopes = "session"
        if user.is_superuser:
            scopes += " superuser"
            
        access_token = create_access_token(
            subject=user.id,
            expires_delta=access_token_expires,
            claims={"scope": scopes, "sid": str(session.id)},
        )
        return Token(access_token=access_token, token_type="bearer")

from pydantic import BaseModel, Field

class ResetPasswordRequest(BaseModel):
    new_password: str

@router.post("/reset-password-forced", response_model=Token)
async def reset_password_forced(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_user_with_scope("password:change"))],
    data: ResetPasswordRequest,
    request: Request = None,
):
    new_password = data.new_password
    # Validate policies
    """
    Endpoint for mandatory password change.
    """
    # Validate policies
    from app.db.models.password_policy import PasswordPolicy
    res = await db.execute(select(PasswordPolicy).limit(1))
    policy = res.scalar_one_or_none()
    if policy:
        if len(new_password) < policy.min_length:
            raise HTTPException(status_code=400, detail=f"Password too short (min {policy.min_length})")
        # ... rest of policies ...

    current_user.hashed_password = get_password_hash(new_password)
    current_user.force_password_change = False
    db.add(current_user)
    await db.commit()
    
    # IMPORTANTE: Verificar si todavía debe enrolar 2FA antes de dar sesión completa
    needs_2fa_setup = current_user.enroll_2fa_mandatory or current_user.reset_2fa_next_login
    
    if current_user.is_2fa_enabled:
        interim_token = create_access_token(
            subject=current_user.id,
            expires_delta=timedelta(minutes=5),
            claims={"scope": "2fa:verify"},
        )
        return Token(access_token=interim_token, token_type="interim")
    
    if needs_2fa_setup:
        interim_token = create_access_token(
            subject=current_user.id,
            expires_delta=timedelta(minutes=15),
            claims={"scope": "2fa:reset"},
        )
        return Token(access_token=interim_token, token_type="interim")
    
    # Si no hay deudas de seguridad, sesión completa
    session = await crud_session.session.create_session(
        db, user_id=current_user.id, ip_address=request.client.host if request else None, user_agent=request.headers.get("user-agent") if request else None
    )
    access_token = create_access_token(
        subject=current_user.id,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        claims={"scope": "session" + (" superuser" if current_user.is_superuser else ""), "sid": str(session.id)},
    )
    await db.commit()
    return Token(access_token=access_token, token_type="bearer")

@router.post("/setup-2fa-forced", response_model=TotpSetupResponse)
async def setup_2fa_forced(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_user_with_scope("2fa:reset"))],
):
    """
    Initial step for mandatory 2FA reset.
    """
    secret = generate_totp_secret()
    provisioning_uri = get_totp_provisioning_uri(current_user.email, secret)
    recovery_codes = generate_recovery_codes()
    
    # Store secret temporarily in user or session? 
    # For simplicity, we'll store it in the user and mark as not enabled yet
    current_user.totp_secret = secret
    current_user.is_2fa_enabled = False # Ensure it's false until verified
    db.add(current_user)
    await db.commit()
    
    return TotpSetupResponse(
        secret=secret,
        provisioning_uri=provisioning_uri,
        recovery_codes=recovery_codes
    )

@router.post("/verify-2fa-forced", response_model=Token)
async def verify_2fa_forced(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_user_with_scope("2fa:reset"))],
    totp_code: str = Body(..., embed=True),
    request: Request = None,
):
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA setup not initiated")
        
    if not verify_totp(current_user.totp_secret, totp_code):
        raise HTTPException(status_code=401, detail="Invalid code")
        
    current_user.is_2fa_enabled = True
    current_user.reset_2fa_next_login = False
    current_user.enroll_2fa_mandatory = False # Limpiar flag de obligación
    db.add(current_user)
    
    # After 2FA reset, check if password change is also needed
    if current_user.force_password_change:
        interim_token = create_access_token(
            subject=current_user.id,
            expires_delta=timedelta(minutes=15),
            claims={"scope": "password:change"},
        )
        await db.commit()
        return Token(access_token=interim_token, token_type="interim")

    session = await crud_session.session.create_session(
        db, user_id=current_user.id, ip_address=request.client.host if request else None, user_agent=request.headers.get("user-agent") if request else None
    )
    access_token = create_access_token(
        subject=current_user.id,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        claims={"scope": "session" + (" superuser" if current_user.is_superuser else ""), "sid": str(session.id)},
    )
    await db.commit()
    return Token(access_token=access_token, token_type="bearer")

@router.post("/login/2fa", response_model=Token)
@limiter.limit("10/minute")
async def login_2fa(
    request: Request,
    totp_data: TotpRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_2fa_user_dep)],
):
    """
    Second step of the login process for users with 2FA enabled.
    Verifies the TOTP code and returns a final session token.
    """
    if not current_user.totp_secret:
         raise HTTPException(status_code=400, detail="2FA not configured")

    if not verify_totp(secret=current_user.totp_secret, code=totp_data.totp_code):
        await crud_audit.audit_log.create_log(
            db,
            user_id=current_user.id,
            event_type="login_2fa_failed",
            ip_address=request.client.host,
            details={"reason": "invalid_totp_code"},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid 2FA code",
        )

    await crud_audit.audit_log.create_log(
        db, user_id=current_user.id, event_type="login_2fa_success", ip_address=request.client.host
    )
    
    # Create the session in the DB
    session = await crud_session.session.create_session(
        db, 
        user_id=current_user.id, 
        ip_address=request.client.host, 
        user_agent=request.headers.get("user-agent")
    )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    scopes = "session"
    if current_user.is_superuser:
        scopes += " superuser"

    access_token = create_access_token(
        subject=current_user.id,
        expires_delta=access_token_expires,
        claims={"scope": scopes, "sid": str(session.id)},
    )
    # Here we should create the session in the DB
    return Token(access_token=access_token, token_type="bearer")
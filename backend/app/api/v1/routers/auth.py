from datetime import timedelta, datetime
from typing import Annotated, Union, Optional, List # Added List

from fastapi import APIRouter, Depends, HTTPException, status, Request # Removed Security
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.limiter import limiter
from app.api import deps
from app.api.deps import get_db, get_current_user, get_crud_user, reusable_oauth2 # Import reusable_oauth2
from app.crud import crud_audit, crud_session
from app.crud.crud_user import user as crud_user_instance # Import the instance directly
from app.schemas.auth import LoginRequest, LoginResponse, TotpRequest
from app.schemas.token import Token
from app.core.security import (
    create_access_token,
    # authenticate_user, # Removed this
    verify_totp,
    verify_password, # Added this
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
    Validates credentials. If 2FA is disabled, returns a session token.
    If 2FA is enabled, returns an interim token for the 2FA step.
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
        # Here we should create the session in the DB
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
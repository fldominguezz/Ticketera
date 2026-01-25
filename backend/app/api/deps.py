from typing import AsyncGenerator, Annotated, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import Depends, HTTPException, status, Request # Removed Security, OAuth2PasswordBearer, SecurityScopes
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials # Import for custom bearer scheme

from sqlalchemy.future import select
from app.db.models.iam import UserRole, Role, RolePermission, Permission
from jose import jwt, JWTError
from uuid import UUID

from app.db.session import AsyncSessionLocal
from app.core.config import settings
from app.db.models import User
from app.crud import crud_user, crud_session
from app.crud.crud_user import user as crud_user_instance # Import the instance directly

# Custom Bearer scheme to avoid OAuth2PasswordBearer's redirect behavior
reusable_oauth2 = HTTPBearer(scheme_name="JWT")

async def get_crud_user() -> crud_user_instance.__class__:
    return crud_user_instance

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    token: HTTPAuthorizationCredentials = Depends(reusable_oauth2), # Get token via custom scheme
    required_scopes: List[str] = None # New argument for required scopes
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token: # HTTPBearer will automatically raise HTTPException if token is missing
        raise credentials_exception # Should not be hit if HTTPBearer works correctly

    try:
        payload = jwt.decode(
            token.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_aud": False}
        )
        user_id: str = payload.get("sub")
        session_id: str = payload.get("sid") # Will be None for interim_token
        token_scope_str: str = payload.get("scope", "")
        token_scopes = token_scope_str.split()

        if user_id is None:
            raise credentials_exception
        
        # Manual Scope validation
        if required_scopes:
            for scope in required_scopes:
                if scope not in token_scopes:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Not enough permissions",
                        headers={"WWW-Authenticate": f'Bearer scope="{",".join(required_scopes)}"'},
                    )

        # Handle different token types based on payload scope
        if "session" in token_scopes: # This is a full session token
            if session_id is None: # Must have a session ID
                raise credentials_exception
            
            # Check if session is active
            session = await crud_session.session.get_session_by_id(db, session_id=UUID(session_id))
            if not session or not session.is_active:
                logger.warning(f"Session {session_id} not found or inactive")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or inactive session",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # Eagerly load user, roles, and permissions
            query = (
                select(User)
                .where(User.id == UUID(user_id))
                .options(
                    selectinload(User.roles)
                    .selectinload(UserRole.role)
                    .selectinload(Role.permissions)
                    .selectinload(RolePermission.permission),
                    selectinload(User.group)
                )
            )
            result = await db.execute(query)
            user = result.scalar_one_or_none()

            if user is None or user.id != session.user_id:
                raise credentials_exception
            return user
        elif "2fa:verify" in token_scopes: # This is an interim token for 2FA
            # For interim tokens, we only need to verify the user exists and is active.
            # No session_id check needed here.
            query = select(User).where(User.id == UUID(user_id))
            result = await db.execute(query)
            user = result.scalar_one_or_none()
            if user is None or not user.is_active:
                raise credentials_exception
            return user
        else: # Unknown or unsupported scope
            raise credentials_exception

    except JWTError as e:
        logger.warning(f"JWT Decode error: {e}")
        raise credentials_exception
    except ValueError as e:
        logger.warning(f"Value error during auth: {e}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"Unexpected auth error: {e}")
        raise credentials_exception

# --- Helper functions to create specific user dependencies ---
async def get_current_active_user_dep(
    db: Annotated[AsyncSession, Depends(get_db)],
    token_auth: HTTPAuthorizationCredentials = Depends(reusable_oauth2)
) -> User:
    return await get_current_user(db, token_auth, required_scopes=["session"])

async def get_current_superuser_dep(
    db: Annotated[AsyncSession, Depends(get_db)],
    token_auth: HTTPAuthorizationCredentials = Depends(reusable_oauth2)
) -> User:
    return await get_current_user(db, token_auth, required_scopes=["session", "superuser"])

async def get_current_2fa_user_dep(
    db: Annotated[AsyncSession, Depends(get_db)],
    token_auth: HTTPAuthorizationCredentials = Depends(reusable_oauth2)
) -> User:
    return await get_current_user(db, token_auth, required_scopes=["2fa:verify"])

async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_active_user_dep)],
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_superuser(
    current_user: Annotated[User, Depends(get_current_superuser_dep)],
) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user

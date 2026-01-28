import logging
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

logger = logging.getLogger(__name__)

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
            # Check if at least one of the required scopes is present in the token
            if not any(scope in token_scopes for scope in required_scopes):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not enough permissions",
                    headers={"WWW-Authenticate": f'Bearer scope="{",".join(required_scopes)}"'},
                )

        # Handle different token types based on payload scope
        is_session_token = "session" in token_scopes
        is_security_token = any(s in token_scopes for s in ["password:change", "2fa:reset", "2fa:verify"])

        if is_session_token:
            if session_id is None:
                raise credentials_exception
            session = await crud_session.session.get_session_by_id(db, session_id=UUID(session_id))
            if not session or not session.is_active:
                raise credentials_exception
            
            # Carga completa para sesión normal
            query = (
                select(User).where(User.id == UUID(user_id))
                .options(
                    selectinload(User.roles).selectinload(UserRole.role).selectinload(Role.permissions).selectinload(RolePermission.permission),
                    selectinload(User.group)
                )
            )
            result = await db.execute(query)
            user = result.scalar_one_or_none()
            if user is None or user.id != session.user_id:
                raise credentials_exception
            return user

        elif is_security_token:
            # Para tokens de seguridad, identificación para permitir onboarding
            # Cargamos relaciones para que el esquema Pydantic no falle
            query = (
                select(User).where(User.id == UUID(user_id))
                .options(
                    selectinload(User.roles).selectinload(UserRole.role).selectinload(Role.permissions).selectinload(RolePermission.permission),
                    selectinload(User.group)
                )
            )
            result = await db.execute(query)
            user = result.scalar_one_or_none()
            if user is None or not user.is_active:
                raise credentials_exception
            return user
        
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

def get_current_user_with_scope(scope: str):
    async def _dep(
        db: Annotated[AsyncSession, Depends(get_db)],
        token_auth: HTTPAuthorizationCredentials = Depends(reusable_oauth2)
    ) -> User:
        return await get_current_user(db, token_auth, required_scopes=[scope])
    return _dep

async def get_current_2fa_user_dep(
    db: Annotated[AsyncSession, Depends(get_db)],
    token_auth: HTTPAuthorizationCredentials = Depends(reusable_oauth2)
) -> User:
    return await get_current_user(db, token_auth, required_scopes=["2fa:verify"])

async def get_current_active_user(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    token_auth: HTTPAuthorizationCredentials = Depends(reusable_oauth2)
) -> User:
    current_user = await get_current_user(db, token_auth)
    
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    path = request.url.path
    exempt_paths = ["/api/v1/auth/", "/api/v1/users/me"]
    is_exempt = any(p in path for p in exempt_paths)
    
    if not is_exempt:
        if current_user.force_password_change:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="SECURITY_CHANGE_PASSWORD_REQUIRED"
            )
        if (current_user.enroll_2fa_mandatory or current_user.reset_2fa_next_login) and not current_user.is_2fa_enabled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="SECURITY_2FA_SETUP_REQUIRED"
            )
            
    return current_user

async def get_current_superuser(
    current_user: Annotated[User, Depends(get_current_superuser_dep)],
) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user

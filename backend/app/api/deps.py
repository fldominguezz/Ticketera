from typing import AsyncGenerator, Annotated, Optional, List, Set, Literal
from uuid import UUID
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from jose import jwt, JWTError
import logging

from app.db.session import AsyncSessionLocal
from app.core.config import settings
from app.db.models import User
from app.db.models.iam import UserRole, Role, RolePermission, Permission
from app.db.models.ticket import Ticket as TicketModel
from app.db.models.endpoint import Endpoint as EndpointModel
from app.db.models.notifications import Attachment as AttachmentModel
from app.services.group_service import group_service

# Custom Bearer scheme
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

reusable_oauth2 = HTTPBearer(scheme_name="JWT", auto_error=False)

AccessLevel = Literal["read", "comment", "update", "delete", "watch", "relation", "subtask"]

async def get_crud_user():
    from app.crud.crud_user import user as crud_user_instance
    return crud_user_instance

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

def get_current_user_with_scope(scope: str):
    async def _scope_checker(
        db: Annotated[AsyncSession, Depends(get_db)],
        token: HTTPAuthorizationCredentials = Depends(reusable_oauth2),
    ) -> User:
        return await get_current_user(db, token, required_scopes=[scope])
    return _scope_checker

async def get_current_2fa_user_dep(
    db: Annotated[AsyncSession, Depends(get_db)],
    token: HTTPAuthorizationCredentials = Depends(reusable_oauth2),
) -> User:
    return await get_current_user(db, token, required_scopes=["2fa:verify"])

async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    token: Optional[HTTPAuthorizationCredentials] = Depends(reusable_oauth2),
    required_scopes: List[str] = None
) -> User:
    from app.crud import crud_session # LOCAL IMPORT
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token or not token.credentials:
        logger.warning("Missing or empty token credentials")
        raise credentials_exception

    try:
        payload = jwt.decode(
            token.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_aud": False}
        )
        user_id: str = payload.get("sub")
        session_id: str = payload.get("sid")
        token_scope_str: str = payload.get("scope", "")
        token_scopes = token_scope_str.split()

        if user_id is None: raise credentials_exception
        
        if required_scopes:
            if not any(scope in token_scopes for scope in required_scopes):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not enough permissions",
                    headers={"WWW-Authenticate": f'Bearer scope="{",".join(required_scopes)}"'},
                )

        is_session_token = "session" in token_scopes
        is_security_token = any(s in token_scopes for s in ["password:change", "2fa:reset", "2fa:verify"])

        if is_session_token:
            if session_id is None: raise credentials_exception
            session = await crud_session.session.get_session_by_id(db, session_id=UUID(session_id))
            if not session or not session.is_active: raise credentials_exception
            
            query = (
                select(User).where(User.id == UUID(user_id))
                .options(
                    selectinload(User.roles).selectinload(UserRole.role).selectinload(Role.permissions).selectinload(RolePermission.permission),
                    selectinload(User.group)
                )
            )
            result = await db.execute(query)
            user = result.scalar_one_or_none()
            if user is None or user.id != session.user_id: raise credentials_exception
            return user

        elif is_security_token:
            query = (
                select(User).where(User.id == UUID(user_id))
                .options(
                    selectinload(User.roles).selectinload(UserRole.role).selectinload(Role.permissions).selectinload(RolePermission.permission),
                    selectinload(User.group)
                )
            )
            result = await db.execute(query)
            user = result.scalar_one_or_none()
            if user is None or not user.is_active: raise credentials_exception
            return user
        
        raise credentials_exception

    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise credentials_exception

async def get_current_active_user(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    token_auth: HTTPAuthorizationCredentials = Depends(reusable_oauth2)
) -> User:
    # Permitir tanto 'session' como tokens de seguridad en esta etapa inicial
    allowed_scopes = ["session", "password:change", "2fa:reset", "2fa:verify"]
    current_user = await get_current_user(db, token_auth, required_scopes=allowed_scopes)
    
    if not current_user.is_active: raise HTTPException(status_code=400, detail="Inactive user")
    
    path = request.url.path
    exempt_paths = ["/api/v1/auth/", "/api/v1/users/me", "/api/v1/locations"]
    
    # Si no es una ruta exenta, verificar que el usuario tenga sesión real
    # para evitar que usen un token de cambio de clave para ver tickets
    if not any(p in path for p in exempt_paths):
        # Extraer scopes reales del token para validación estricta
        from jose import jwt
        payload = jwt.decode(token_auth.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_aud": False})
        token_scopes = payload.get("scope", "").split()
        
        if "session" not in token_scopes:
            raise HTTPException(status_code=403, detail="Se requiere una sesión completa para acceder a este recurso (Token Interino detectado).")

        # EXENCIÓN PARA ADMIN Y CUENTAS DE SERVICIO
        if current_user.username in ['admin', 'fortisiem'] or current_user.policy_exempt:
            return current_user

        if current_user.force_password_change:
            raise HTTPException(status_code=403, detail="SECURITY_CHANGE_PASSWORD_REQUIRED")
        if (current_user.enroll_2fa_mandatory or current_user.reset_2fa_next_login) and not current_user.is_2fa_enabled:
            raise HTTPException(status_code=403, detail="SECURITY_2FA_SETUP_REQUIRED")
            
    return current_user

def require_permission(permission_key: str):
    async def _permission_checker(
        current_user: Annotated[User, Depends(get_current_active_user)]
    ) -> User:
        if current_user.is_superuser: return current_user
        if not current_user.has_permission(permission_key):
             raise HTTPException(status_code=403, detail=f"No tienes permiso suficiente ({permission_key})")
        return current_user
    return _permission_checker

def require_role(allowed_roles: List[str]):
    async def _role_checker(
        current_user: Annotated[User, Depends(get_current_active_user)]
    ) -> User:
        if current_user.is_superuser: return current_user
        user_roles: Set[str] = {user_role.role.name for user_role in current_user.roles}
        if not any(role in allowed_roles for role in user_roles):
            raise HTTPException(status_code=403, detail="No tienes el rol requerido")
        return current_user
    return _role_checker

async def get_current_superuser(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> User:
    if not current_user.is_superuser: raise HTTPException(status_code=403, detail="Solo superusuarios")
    return current_user

# --- Object Level Dependencies (Ticket, Endpoint, Attachment) ---

def require_ticket_permission(action: str):
    """
    Validates granular permissions for a specific ticket.
    action: 'read', 'update', 'delete', 'comment', 'assign'
    """
    async def _ticket_permission_checker(
        ticket_id: UUID,
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_active_user)],
    ) -> TicketModel:
        from app.crud import crud_ticket # LOCAL IMPORT
        
        # 1. Cargar ticket con relaciones necesarias
        query = (
            select(TicketModel)
            .where(TicketModel.id == ticket_id)
            .options(
                selectinload(TicketModel.group),
                selectinload(TicketModel.assigned_to),
                selectinload(TicketModel.ticket_type),
                selectinload(TicketModel.asset),
                selectinload(TicketModel.location),
                selectinload(TicketModel.sla_metric)
            )
        )
        result = await db.execute(query)
        ticket = result.scalar_one_or_none()
        
        if not ticket: raise HTTPException(status_code=404, detail="No encontrado")
        
        if current_user.is_superuser: return ticket
    pass
        # Capability Mapping
        # We check for:
        # 0. MASTER action permission (e.g. ticket:comment)
        if current_user.has_permission(f"ticket:{action}"):
            return ticket

        # 1. Check GLOBAL capability
        if current_user.has_permission(f"ticket:{action}:global"):
            return ticket
            
        # 2. Check GROUP capability
        if current_user.has_permission(f"ticket:{action}:group"):
            # Check if ticket is in user's group hierarchy
            if ticket.group_id == current_user.group_id or ticket.owner_group_id == current_user.group_id:
                return ticket
            # Check subgroups
            child_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
            if ticket.group_id in child_ids or ticket.owner_group_id in child_ids:
                return ticket
                
        # 3. Check ASSIGNED capability (Specific for Update/Read)
        if current_user.has_permission(f"ticket:{action}:assigned"):
            if ticket.assigned_to_id == current_user.id:
                return ticket

        # 4. Check OWN capability (Specific for Read/Update)
        if current_user.has_permission(f"ticket:{action}:own"):
            # 'own' usually means 'created by me' or 'assigned to me' for reading
            if ticket.created_by_id == current_user.id:
                return ticket
            if action == 'read' and ticket.assigned_to_id == current_user.id:
                return ticket

        raise HTTPException(status_code=403, detail="No tienes acceso a este ticket (Scope Restriction)")
    return _ticket_permission_checker

def require_endpoint_permission(level: str):
    async def _checker(
        endpoint_id: UUID,
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_active_user)],
    ) -> EndpointModel:
        from app.crud import crud_endpoint # LOCAL IMPORT
        if level != "create":
            endpoint = await crud_endpoint.endpoint.get(db, id=endpoint_id)
            if not endpoint: raise HTTPException(status_code=404, detail="No encontrado")
            if current_user.is_superuser: return endpoint
            user_groups = await group_service.get_all_child_group_ids(db, current_user.group_id)
            if endpoint.group_id not in user_groups: raise HTTPException(status_code=403, detail="Fuera de jerarquía")
            return endpoint
        return EndpointModel(id=UUID("00000000-0000-0000-0000-000000000000"))
    return _checker

def require_attachment_permission(level: str):
    async def _checker(
        attachment_id: UUID,
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_active_user)],
    ) -> AttachmentModel:
        from app.crud import crud_attachment, crud_ticket # LOCAL IMPORT
        att = await crud_attachment.attachment.get(db, id=attachment_id)
        if not att: raise HTTPException(status_code=404, detail="No encontrado")
        if current_user.is_superuser: return att
        ticket = await crud_ticket.ticket.get(db, id=att.ticket_id)
        # Re-use ticket permission logic implicitly or check here
        # For now, simplistic hierarchy check
        user_groups = await group_service.get_all_child_group_ids(db, current_user.group_id)
        if ticket.group_id not in user_groups: raise HTTPException(status_code=403, detail="Fuera de jerarquía")
        return att
    return _checker

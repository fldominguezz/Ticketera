from pydantic import BaseModel, EmailStr, ConfigDict, model_validator
from uuid import UUID
from typing import Optional, List, Any
from .iam import Role
from .group import Group as GroupSchema # Import GroupSchema
from datetime import datetime
import enum
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"
    ANALYST = "analyst"
    MANAGER = "manager"
class UserBase(BaseModel):
    username: str
    email: EmailStr
    first_name: str
    last_name: str
    is_active: bool = True
    is_superuser: bool = False
    is_2fa_enabled: bool = False
    force_password_change: bool = False
    reset_2fa_next_login: bool = False
    enroll_2fa_mandatory: bool = False
    group_id: Optional[UUID] = None 
    group_name: Optional[str] = None
    preferred_language: Optional[str] = "es"
    avatar_url: Optional[str] = None
    dashboard_layout: Optional[List[dict]] = []
    created_at: Optional[datetime] = None
class UserCreate(UserBase):
    password: str
    role_ids: Optional[List[UUID]] = []
class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    force_password_change: Optional[bool] = None
    reset_2fa_next_login: Optional[bool] = None
    group_id: Optional[UUID] = None
    role_ids: Optional[List[UUID]] = None
    dashboard_layout: Optional[List[dict]] = None
class UserInDBBase(UserBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)
class User(UserInDBBase):
    roles: List[Role] = []
    permissions: List[str] = [] # Flat list of permission keys for frontend validation
    group: Optional[GroupSchema] = None # Add group field
    @model_validator(mode='before')
    @classmethod
    def flatten_roles(cls, data: Any) -> Any:
        # Si ya es un dict (ej. del endpoint /me modificado), lo dejamos pasar o lo ajustamos
        if isinstance(data, dict):
            return data
        if hasattr(data, "roles"):
            roles = []
            permissions_set = set()
            for ur in data.roles:
                role_obj = getattr(ur, "role", ur)
                roles.append(role_obj)
                # Extraer permisos del rol
                if hasattr(role_obj, "permissions"):
                    for rp in role_obj.permissions:
                        perm_obj = getattr(rp, "permission", rp)
                        if hasattr(perm_obj, "key"):
                            permissions_set.add(perm_obj.key)
            # Construct a dictionary to return, including group details
            return_data = {
                "id": data.id,
                "username": data.username,
                "email": data.email,
                "first_name": data.first_name,
                "last_name": data.last_name,
                "is_active": data.is_active,
                "is_superuser": data.is_superuser,
                "is_2fa_enabled": data.is_2fa_enabled,
                "force_password_change": getattr(data, "force_password_change", False),
                "reset_2fa_next_login": getattr(data, "reset_2fa_next_login", False),
                "enroll_2fa_mandatory": getattr(data, "enroll_2fa_mandatory", False),
                "dashboard_layout": getattr(data, "dashboard_layout", []) or [],
                "avatar_url": getattr(data, "avatar_url", None),
                "group_id": data.group_id,
                "group_name": data.group.name if hasattr(data, "group") and data.group else None,
                "preferred_language": data.preferred_language,
                "created_at": getattr(data, "created_at", None),
                "roles": roles,
                "permissions": list(permissions_set)
            }
            if hasattr(data, "group") and data.group:
                return_data["group"] = data.group
            else:
                return_data["group"] = None
            return return_data
        return data

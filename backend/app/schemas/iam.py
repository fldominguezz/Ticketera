from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict, model_validator

class PermissionBase(BaseModel):
    key: str
    name: str # Human readable name
    description: Optional[str] = None
    module: Optional[str] = "custom"
    scope_type: Optional[str] = "none" # none, own, group, global
    is_active: bool = True

class PermissionCreate(PermissionBase):
    pass

class PermissionUpdate(BaseModel):
    key: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    module: Optional[str] = None
    scope_type: Optional[str] = None
    is_active: Optional[bool] = None

class Permission(PermissionBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)

class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None
    hidden_nav_items: List[str] = []

class RoleCreate(RoleBase):
    permission_ids: List[UUID] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    hidden_nav_items: Optional[List[str]] = None
    permission_ids: Optional[List[UUID]] = None

class Role(RoleBase):
    id: UUID
    permissions: List[Permission] = []
    
    @model_validator(mode='before')
    @classmethod
    def wrap_permissions(cls, data: Any) -> Any:
        if hasattr(data, "permissions"):
            permissions = []
            for rp in data.permissions:
                if hasattr(rp, "permission"):
                    permissions.append(rp.permission)
                else:
                    permissions.append(rp)
            
            return {
                "id": data.id,
                "name": data.name,
                "description": data.description,
                "hidden_nav_items": getattr(data, "hidden_nav_items", []),
                "permissions": permissions
            }
        return data

    model_config = ConfigDict(from_attributes=True)

class UserRoleAssignment(BaseModel):
    user_id: UUID
    role_id: UUID

class UserWithRoles(BaseModel):
    id: UUID
    username: str
    email: str
    roles: List[Role] = []

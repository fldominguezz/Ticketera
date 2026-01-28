from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict, model_validator

class PermissionBase(BaseModel):
    name: str
    description: Optional[str] = None

class Permission(PermissionBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)

class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None

class RoleCreate(RoleBase):
    permission_ids: List[UUID] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[UUID]] = None

class Role(RoleBase):
    id: UUID
    permissions: List[Permission] = []
    
    @model_validator(mode='before')
    @classmethod
    def wrap_permissions(cls, data: Any) -> Any:
        if hasattr(data, "permissions"):
            # Si es un objeto de SQLAlchemy, extraemos las de RolePermission
            # En SQLAlchemy, role.permissions es una lista de RolePermission
            # Queremos que sea una lista de Permission
            permissions = []
            for rp in data.permissions:
                if hasattr(rp, "permission"):
                    permissions.append(rp.permission)
                else:
                    # Si ya es un dict o algo procesado
                    permissions.append(rp)
            
            # Creamos un nuevo dict o modificamos el objeto para Pydantic
            # Pero como es 'before', 'data' es lo que se va a validar.
            # No podemos modificar el objeto de SQLAlchemy fácilmente.
            # Así que devolvemos un dict.
            return {
                "id": data.id,
                "name": data.name,
                "description": data.description,
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

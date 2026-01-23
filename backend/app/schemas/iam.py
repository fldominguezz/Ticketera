from pydantic import BaseModel, Field, ConfigDict # Added ConfigDict
from uuid import UUID
from typing import List, Optional # Import Optional

class RoleBase(BaseModel):
    name: str = Field(..., description="The name of the role.")
    description: Optional[str] = None # Changed from str | None

class RoleCreate(RoleBase):
    pass

class Role(RoleBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True) # Changed from class Config

class UserRoleAssignment(BaseModel):
    user_id: UUID
    role_id: UUID

class UserWithRoles(BaseModel):
    id: UUID
    username: str
    email: str
    roles: List[Role]
    model_config = ConfigDict(from_attributes=True) # Changed from class Config


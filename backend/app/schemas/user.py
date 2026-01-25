from pydantic import BaseModel, EmailStr, ConfigDict # Added ConfigDict
from uuid import UUID
from typing import Optional

class UserBase(BaseModel):
    username: str
    email: EmailStr
    first_name: str
    last_name: str
    is_active: bool = True
    is_superuser: bool = False
    is_2fa_enabled: bool = False
    group_id: Optional[UUID] = None 
    group_name: Optional[str] = None
    preferred_language: Optional[str] = "es" # Hago group_id opcional por ahora para la creación inicial

class UserCreate(UserBase):
    password: str

class UserUpdate(UserBase):
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    group_id: Optional[UUID] = None

class UserInDBBase(UserBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True) # Changed from class Config

class User(UserInDBBase):
    pass

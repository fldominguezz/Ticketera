from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
from uuid import UUID

from app.db.models.user import User
from app.db.models.iam import UserRole
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash
from app.db.models.group import Group # Importar Group para crear un grupo por defecto si no existe
from sqlalchemy import delete

import string
import random

class CRUDUser:
    def generate_random_password(self, length: int = 12) -> str:
        chars = string.ascii_letters + string.digits + "!@#$%^&*"
        return "".join(random.choice(chars) for _ in range(length))

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(select(User).filter(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_username(self, db: AsyncSession, username: str) -> Optional[User]:
        result = await db.execute(select(User).filter(User.username == username))
        return result.scalar_one_or_none()

    async def get_by_username_or_email(self, db: AsyncSession, identifier: str) -> Optional[User]:
        result = await db.execute(
            select(User).filter((User.username == identifier) | (User.email == identifier))
        )
        return result.scalar_one_or_none()

    async def get(self, db: AsyncSession, user_id: UUID) -> Optional[User]:
        result = await db.execute(select(User).filter(User.id == user_id))
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, obj_in: UserCreate) -> User:
        # Password Policy Validation
        from app.db.models.password_policy import PasswordPolicy
        res = await db.execute(select(PasswordPolicy).limit(1))
        policy = res.scalar_one_or_none()
        if policy:
            p = obj_in.password
            if len(p) < policy.min_length:
                raise ValueError(f"Password too short (min {policy.min_length})")
            if policy.requires_uppercase and not any(c.isupper() for c in p):
                raise ValueError("Uppercase required")
            if policy.requires_number and not any(c.isdigit() for c in p):
                raise ValueError("Number required")

        # Lógica para asegurar un group_id
        if not obj_in.group_id:
            root_group_name = "División Seguridad Informática"
            root_group_query = await db.execute(select(Group).filter(Group.name == root_group_name))
            root_group = root_group_query.scalar_one_or_none()

            if not root_group:
                # Si no existe, lo creamos
                import uuid
                new_group = Group(id=uuid.uuid4(), name=root_group_name, description="Grupo raíz para la administración de seguridad.")
                db.add(new_group)
                await db.commit()
                await db.refresh(new_group)
                obj_in.group_id = new_group.id
            else:
                obj_in.group_id = root_group.id

        hashed_password = get_password_hash(obj_in.password)
        # Usuarios de servicio exceptuados de 2FA obligatorio
        service_users = ['fortisiem', 'admin', 'system']
        is_service_user = obj_in.username.lower() in service_users

        db_user = User(
            username=obj_in.username,
            email=obj_in.email,
            hashed_password=hashed_password,
            first_name=obj_in.first_name,
            last_name=obj_in.last_name,
            group_id=obj_in.group_id,
            is_active=obj_in.is_active,
            is_superuser=obj_in.is_superuser,
            force_password_change=obj_in.force_password_change,
            reset_2fa_next_login=obj_in.reset_2fa_next_login,
            enroll_2fa_mandatory=obj_in.reset_2fa_next_login # Si resetea 2FA, es obligatorio enrollar
        )
        db.add(db_user)
        await db.flush() # Flush the user to get its ID before assigning roles
        
        # Asignar roles si se proporcionan
        if obj_in.role_ids:
            for role_id in obj_in.role_ids:
                user_role = UserRole(user_id=db_user.id, role_id=role_id)
                db.add(user_role)
                
        await db.commit()
        await db.refresh(db_user)
        return db_user

    async def update(self, db: AsyncSession, db_obj: User, obj_in: UserUpdate) -> User:
        if obj_in.password:
            db_obj.hashed_password = get_password_hash(obj_in.password)
        
        update_data = obj_in.model_dump(exclude_unset=True)
        for var, value in update_data.items():
            if var not in ["password", "role_ids"]: 
                setattr(db_obj, var, value)
        
        db.add(db_obj)
        
        # Actualizar roles si se proporcionan
        if obj_in.role_ids is not None:
            # Eliminar roles actuales
            await db.execute(
                delete(UserRole).where(UserRole.user_id == db_obj.id)
            )
            # Agregar nuevos roles
            for role_id in obj_in.role_ids:
                user_role = UserRole(user_id=db_obj.id, role_id=role_id)
                db.add(user_role)
        
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

user = CRUDUser()

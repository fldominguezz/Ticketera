from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
from uuid import UUID

from app.db.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash
from app.db.models.group import Group # Importar Group para crear un grupo por defecto si no existe

class CRUDUser:
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
        db_user = User(
            username=obj_in.username,
            email=obj_in.email,
            hashed_password=hashed_password,
            first_name=obj_in.first_name,
            last_name=obj_in.last_name,
            group_id=obj_in.group_id, # Ahora ya tiene group_id
            is_active=obj_in.is_active,
            is_superuser=obj_in.is_superuser
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user

    async def update(self, db: AsyncSession, db_obj: User, obj_in: UserUpdate) -> User:
        if obj_in.password:
            db_obj.hashed_password = get_password_hash(obj_in.password)
        
        for var, value in obj_in.model_dump(exclude_unset=True).items():
            if var != "password": # No actualizar directamente el password sin hashear
                setattr(db_obj, var, value)
        
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

user = CRUDUser()

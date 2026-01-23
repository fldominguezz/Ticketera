from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from typing import List, Optional

from app.db.models.iam import Role, Permission, UserRole

class CRUDIAM:
    # Role CRUD
    async def create_role(self, db: AsyncSession, *, name: str, description: str = "") -> Role:
        role = Role(name=name, description=description)
        db.add(role)
        await db.commit()
        await db.refresh(role)
        return role

    async def get_role_by_name(self, db: AsyncSession, *, name: str) -> Optional[Role]:
        result = await db.execute(select(Role).filter(Role.name == name))
        return result.scalar_one_or_none()

    # Permission CRUD
    async def create_permission(self, db: AsyncSession, *, name: str, description: str = "") -> Permission:
        permission = Permission(name=name, description=description)
        db.add(permission)
        await db.commit()
        await db.refresh(permission)
        return permission

    async def get_permission_by_name(self, db: AsyncSession, *, name: str) -> Optional[Permission]:
        result = await db.execute(select(Permission).filter(Permission.name == name))
        return result.scalar_one_or_none()

    # User-Role assignment
    async def assign_role_to_user(self, db: AsyncSession, *, user_id: UUID, role_id: UUID) -> UserRole:
        user_role = UserRole(user_id=user_id, role_id=role_id)
        db.add(user_role)
        await db.commit()
        await db.refresh(user_role)
        return user_role

    async def get_user_roles(self, db: AsyncSession, *, user_id: UUID) -> List[Role]:
        result = await db.execute(
            select(Role)
            .join(UserRole)
            .where(UserRole.user_id == user_id)
        )
        return result.scalars().all()

iam = CRUDIAM()

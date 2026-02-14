from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from typing import List, Optional
from app.db.models.iam import Role, Permission, UserRole, RolePermission
from app.schemas.iam import RoleUpdate, PermissionUpdate, PermissionCreate
from sqlalchemy import delete
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
    async def get_role(self, db: AsyncSession, *, role_id: UUID) -> Optional[Role]:
        result = await db.execute(select(Role).filter(Role.id == role_id))
        return result.scalar_one_or_none()
    async def get_all_roles(self, db: AsyncSession) -> List[Role]:
        result = await db.execute(select(Role))
        return result.scalars().all()
    async def update_role(self, db: AsyncSession, *, role: Role, role_in: RoleUpdate) -> Role:
        if role_in.name is not None:
            role.name = role_in.name
        if role_in.description is not None:
            role.description = role_in.description
        if role_in.permission_ids is not None:
            # Clear existing permissions
            # Note: role.permissions is a list of RolePermission objects in SQLAlchemy, 
            # but if we use relationship secondary or view, it varies.
            # In iam.py model: permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
            # So clearing it deletes the association.
            # However, role.permissions.clear() might not work as expected with async session without loading.
            # Better to delete explicitly.
            await db.execute(delete(RolePermission).where(RolePermission.role_id == role.id))
            # Add new permissions
            for permission_id in role_in.permission_ids:
                rp = RolePermission(role_id=role.id, permission_id=permission_id)
                db.add(rp)
        db.add(role)
        await db.commit()
        await db.refresh(role)
        return role
    async def delete_role(self, db: AsyncSession, *, role_id: UUID) -> None:
        role = await db.get(Role, role_id)
        if role:
            await db.delete(role)
            await db.commit()
    # Permission CRUD
    async def create_permission(self, db: AsyncSession, *, obj_in: PermissionCreate) -> Permission:
        permission = Permission(
            key=obj_in.key,
            name=obj_in.name,
            description=obj_in.description,
            module=obj_in.module,
            scope_type=obj_in.scope_type,
            is_active=obj_in.is_active
        )
        db.add(permission)
        await db.commit()
        await db.refresh(permission)
        return permission
    async def get_permission_by_key(self, db: AsyncSession, *, key: str) -> Optional[Permission]:
        result = await db.execute(select(Permission).filter(Permission.key == key))
        return result.scalar_one_or_none()
    async def get_permission_by_name(self, db: AsyncSession, *, name: str) -> Optional[Permission]:
        # Deprecated or alias to label search
        result = await db.execute(select(Permission).filter(Permission.name == name))
        return result.scalar_one_or_none()
    async def get_all_permissions(self, db: AsyncSession) -> List[Permission]:
        result = await db.execute(select(Permission).order_by(Permission.module, Permission.key))
        return result.scalars().all()
    async def get_permission(self, db: AsyncSession, *, permission_id: UUID) -> Optional[Permission]:
        result = await db.execute(select(Permission).filter(Permission.id == permission_id))
        return result.scalar_one_or_none()
    async def update_permission(self, db: AsyncSession, *, permission: Permission, obj_in: PermissionUpdate) -> Permission:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(permission, field, value)
        db.add(permission)
        await db.commit()
        await db.refresh(permission)
        return permission
    async def delete_permission(self, db: AsyncSession, *, permission_id: UUID) -> None:
        permission = await db.get(Permission, permission_id)
        if permission:
            await db.delete(permission)
            await db.commit()
    async def add_permission_to_role(self, db: AsyncSession, *, role: Role, permission: Permission) -> Role:
        role_permission = RolePermission(role_id=role.id, permission_id=permission.id)
        db.add(role_permission)
        await db.commit()
        await db.refresh(role)
        return role
    async def remove_permission_from_role(self, db: AsyncSession, *, role: Role, permission: Permission) -> Role:
        await db.execute(
            delete(RolePermission).where(
                RolePermission.role_id == role.id,
                RolePermission.permission_id == permission.id
            )
        )
        await db.commit()
        await db.refresh(role)
        return role
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
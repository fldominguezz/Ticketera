import asyncio
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.db.models.iam import Role, Permission, UserRole, RolePermission
from sqlalchemy.future import select
from sqlalchemy import delete

async def full_audit_fix():
    async with AsyncSessionLocal() as db:
        
        # 1. Obtener al admin
        res = await db.execute(select(User).where(User.username == 'admin'))
        admin = res.scalar_one_or_none()
        if not admin:
            return

        # 2. Crear rol Administrator si no existe
        res = await db.execute(select(Role).where(Role.name == 'Administrator'))
        admin_role = res.scalar_one_or_none()
        if not admin_role:
            admin_role = Role(name='Administrator', description='Acceso total al sistema')
            db.add(admin_role)
            await db.flush()

        # 3. Vincular todos los permisos al rol
        res = await db.execute(select(Permission))
        all_perms = res.scalars().all()
        
        # Limpiar permisos viejos del rol
        await db.execute(delete(RolePermission).where(RolePermission.role_id == admin_role.id))
        
        for p in all_perms:
            db.add(RolePermission(role_id=admin_role.id, permission_id=p.id))
        

        # 4. Asegurar que el usuario tenga ese rol
        res = await db.execute(select(UserRole).where(UserRole.user_id == admin.id, UserRole.role_id == admin_role.id))
        if not res.scalar_one_or_none():
            db.add(UserRole(user_id=admin.id, role_id=admin_role.id))

        await db.commit()

if __name__ == "__main__":
    asyncio.run(full_audit_fix())

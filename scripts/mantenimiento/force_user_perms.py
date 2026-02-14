import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.db.models.iam import Role, UserRole, Permission, RolePermission
import sys
import os

sys.path.append(os.getcwd())

async def fix_users_permissions():
    async with AsyncSessionLocal() as db:
        print("Starting manual permission fix...")
        
        # 1. Obtener Roles
        res_soc = await db.execute(select(Role).where(Role.name == "Area SOC"))
        role_soc = res_soc.scalar_one_or_none()
        
        res_admin = await db.execute(select(Role).where(Role.name == "Administrator"))
        role_admin = res_admin.scalar_one_or_none()

        # 2. Reparar ccsbaglia
        res_cc = await db.execute(select(User).where(User.username == "ccsbaglia"))
        u_cc = res_cc.scalar_one_or_none()
        if u_cc and role_soc:
            u_cc.is_active = True
            u_cc.failed_login_attempts = 0
            u_cc.locked_until = None
            # Asegurar que tiene el rol Area SOC
            res_ur = await db.execute(select(UserRole).where(UserRole.user_id == u_cc.id, UserRole.role_id == role_soc.id))
            if not res_ur.scalar_one_or_none():
                db.add(UserRole(user_id=u_cc.id, role_id=role_soc.id))
            print(f"Fixed ccsbaglia: Role '{role_soc.name}' assigned and user activated.")

        # 3. Reparar jzarate
        res_jz = await db.execute(select(User).where(User.username == "jzarate"))
        u_jz = res_jz.scalar_one_or_none()
        if u_jz and role_admin:
            u_jz.is_active = True
            u_jz.failed_login_attempts = 0
            u_jz.locked_until = None
            # Asegurar que tiene el rol Administrator
            res_ur = await db.execute(select(UserRole).where(UserRole.user_id == u_jz.id, UserRole.role_id == role_admin.id))
            if not res_ur.scalar_one_or_none():
                db.add(UserRole(user_id=u_jz.id, role_id=role_admin.id))
            print(f"Fixed jzarate: Role '{role_admin.name}' assigned and user activated.")

        # 4. Asegurar que el permiso de dashboard existe y está en Area SOC
        res_p = await db.execute(select(Permission).where(Permission.name == "dashboard:view:stats"))
        perm = res_p.scalar_one_or_none()
        if perm and role_soc:
            res_rp = await db.execute(select(RolePermission).where(RolePermission.role_id == role_soc.id, RolePermission.permission_id == perm.id))
            if not res_rp.scalar_one_or_none():
                db.add(RolePermission(role_id=role_soc.id, permission_id=perm.id))
                print("Added 'dashboard:view:stats' to Area SOC role.")

        await db.commit()
        print("✅ Success: Users and roles synchronized.")

if __name__ == "__main__":
    asyncio.run(fix_users_permissions())

import asyncio
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.db.models.group import Group
from app.db.models.iam import Role, UserRole, Permission, RolePermission
import sys
import os

sys.path.append(os.getcwd())

async def bulk_fix_all_access():
    async with AsyncSessionLocal() as db:
        print("Starting bulk access fix for all users and roles...")
        
        # 1. Obtener todos los roles y permisos necesarios
        res_roles = await db.execute(select(Role))
        roles_map = {r.name: r for r in res_roles.scalars().all()}
        
        res_perms = await db.execute(select(Permission))
        perms_map = {p.name: p for p in res_perms.scalars().all()}
        
        # Asegurar que todos los roles tengan permiso de Dashboard
        dash_perm = perms_map.get("dashboard:view:stats")
        if dash_perm:
            for r_name, role in roles_map.items():
                if r_name == "Administrator": continue
                res_rp = await db.execute(select(RolePermission).where(RolePermission.role_id == role.id, RolePermission.permission_id == dash_perm.id))
                if not res_rp.scalar_one_or_none():
                    db.add(RolePermission(role_id=role.id, permission_id=dash_perm.id))
                    print(f"Habilitado Dashboard para rol: {r_name}")

        # 2. Procesar todos los usuarios
        res_users = await db.execute(select(User).options(selectinload(User.group)))
        users = res_users.scalars().all()
        
        for u in users:
            # Activar y limpiar bloqueos
            u.is_active = True
            u.failed_login_attempts = 0
            u.locked_until = None
            
            # Sincronizar Rol basado en su Grupo
            if u.group:
                group_name = u.group.name
                # Mapeo directo: si el grupo se llama igual que el rol, los unimos
                if group_name in roles_map:
                    target_role = roles_map[group_name]
                    # Verificar si ya tiene ese rol
                    res_ur = await db.execute(select(UserRole).where(UserRole.user_id == u.id, UserRole.role_id == target_role.id))
                    if not res_ur.scalar_one_or_none():
                        db.add(UserRole(user_id=u.id, role_id=target_role.id))
                        print(f"Usuario {u.username}: Asignado rol {group_name} (por grupo)")
            
            # Caso especial: admin siempre es Administrator
            if u.username == "admin" and "Administrator" in roles_map:
                admin_role = roles_map["Administrator"]
                res_ur = await db.execute(select(UserRole).where(UserRole.user_id == u.id, UserRole.role_id == admin_role.id))
                if not res_ur.scalar_one_or_none():
                    db.add(UserRole(user_id=u.id, role_id=admin_role.id))

        await db.commit()
        print("✅ Global access fix complete. All users activated and roles synced.")

if __name__ == "__main__":
    asyncio.run(bulk_fix_all_access())

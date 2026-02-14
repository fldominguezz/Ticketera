import asyncio
import os
import sys
import json

sys.path.append(os.getcwd())
from app.db.session import AsyncSessionLocal
from app.db.models.iam import UserRole, Role, RolePermission, Permission
from app.db.models.user import User
from sqlalchemy import select

async def audit_iam():
    async with AsyncSessionLocal() as db:
        # 1. Listar Usuarios y si son Superusuarios
        res_users = await db.execute(select(User.id, User.email, User.is_superuser))
        users = res_users.fetchall()
        
        # 2. Listar Asignaciones de Roles
        res_assign = await db.execute(
            select(User.email, Role.name)
            .join(UserRole, User.id == UserRole.user_id)
            .join(Role, Role.id == UserRole.role_id)
        )
        assignments = res_assign.fetchall()
        
        # 3. Listar Roles y sus Permisos
        res_roles = await db.execute(select(Role.name, Role.id))
        roles = res_roles.fetchall()
        
        role_details = {}
        for r_name, r_id in roles:
            res_p = await db.execute(
                select(Permission.name)
                .join(RolePermission)
                .filter(RolePermission.role_id == r_id)
            )
            role_details[r_name] = res_p.scalars().all()

        print(json.dumps({
            "status": "Audit Complete",
            "users_system_flag": [{"email": u.email, "is_superuser": u.is_superuser} for u in users],
            "role_assignments": [{"user": a[0], "role": a[1]} for a in assignments],
            "role_permissions_matrix": role_details
        }, indent=2))

if __name__ == "__main__":
    asyncio.run(audit_iam())

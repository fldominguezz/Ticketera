import asyncio
import os
import sys

# Añadir el path para encontrar el módulo app
sys.path.append("/app")

from app.db.session import AsyncSessionLocal
from app.db.models.iam import Role, RolePermission, Permission
from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def check_role_permissions():
    async with AsyncSessionLocal() as db:
        # Buscar roles que contengan "Administrador SOC"
        query = (
            select(Role)
            .where(Role.name == "Administrador SOC")
            .options(
                selectinload(Role.permissions).selectinload(RolePermission.permission)
            )
        )
        result = await db.execute(query)
        roles = result.scalars().all()
        
        if not roles:
            print("No se encontró ningún rol con la palabra 'Staff'.")
            print("Listando TODOS los roles disponibles:")
            res_all = await db.execute(select(Role))
            all_roles = res_all.scalars().all()
            for r in all_roles:
                print(f"- {r.name}")
            return

        for role in roles:
            print(f"\nRol: {role.name}")
            print(f"Descripción: {role.description}")
            print("Permisos:")
            if not role.permissions:
                print("  (Sin permisos asignados)")
            else:
                for rp in role.permissions:
                    perm = rp.permission
                    if perm:
                        print(f"  - {perm.name}: {perm.description}")
                    else:
                        print(f"  - Permiso ID {rp.permission_id} (No encontrado en tabla permissions)")

if __name__ == "__main__":
    asyncio.run(check_role_permissions())

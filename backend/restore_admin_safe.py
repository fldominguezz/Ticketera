import asyncio
import os
import sys
from uuid import uuid4

# Añadir el path para encontrar el módulo app
sys.path.append("/app")

from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.db.models.iam import Role, UserRole
from sqlalchemy import select

async def restore_admin():
    async with AsyncSessionLocal() as db:
        # 1. Buscar el usuario admin
        res = await db.execute(select(User).filter(User.username == "admin"))
        admin = res.scalar_one_or_none()
        
        if not admin:
            print("Usuario 'admin' no encontrado.")
            return

        print(f"Restaurando permisos para: {admin.username} ({admin.email})")
        admin.is_superuser = True
        admin.is_active = True
        db.add(admin)

        # 2. Buscar roles administrativos
        res_roles = await db.execute(select(Role).filter(Role.name.ilike("%Admin%")))
        roles = res_roles.scalars().all()
        
        if roles:
            for role in roles:
                # Verificar si ya tiene el rol
                res_ur = await db.execute(
                    select(UserRole).filter(
                        UserRole.user_id == admin.id,
                        UserRole.role_id == role.id
                    )
                )
                if not res_ur.scalar_one_or_none():
                    print(f"Asignando rol: {role.name}")
                    new_ur = UserRole(user_id=admin.id, role_id=role.id)
                    db.add(new_ur)
                else:
                    print(f"Ya tiene el rol: {role.name}")
        else:
            print("No se encontraron roles con la palabra 'Admin'.")

        await db.commit()
        print("Restauración completada con éxito.")

if __name__ == "__main__":
    asyncio.run(restore_admin())

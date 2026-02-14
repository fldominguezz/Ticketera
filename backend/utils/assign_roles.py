import asyncio
import os
import sys

sys.path.append(os.getcwd())
from app.db.session import AsyncSessionLocal
from app.db.models.iam import Role, UserRole
from app.db.models.user import User
from sqlalchemy import select

async def assign_initial_roles():
    async with AsyncSessionLocal() as db:
        # Traer rol de Administrador
        res_role = await db.execute(select(Role).where(Role.name == "Administrador SOC"))
        admin_role = res_role.scalar_one_or_none()
        
        if not admin_role:
            print("Error: No existe el rol Administrador SOC. Ejecute seed_iam primero.")
            return

        # Traer todos los usuarios
        res_users = await db.execute(select(User))
        users = res_users.scalars().all()
        
        for u in users:
            # Comprobar si ya tiene el rol
            res_exists = await db.execute(select(UserRole).filter(UserRole.user_id == u.id, UserRole.role_id == admin_role.id))
            if not res_exists.scalar_one_or_none():
                print(f"Asignando rol Administrador SOC a {u.email}...")
                ur = UserRole(user_id=u.id, role_id=admin_role.id)
                db.add(ur)
        
        await db.commit()
        print("Asignación completada.")

if __name__ == "__main__":
    asyncio.run(assign_initial_roles())

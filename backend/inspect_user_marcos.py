import asyncio
import os
import sys

sys.path.append("/app")
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.db.models.iam import Role, UserRole
from app.db.models.group import Group
from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def inspect_marcos():
    async with AsyncSessionLocal() as db:
        # Buscar por nombre aproximado
        query = (
            select(User)
            .where(
                (User.first_name.ilike("%Marcos%")) | 
                (User.last_name.ilike("%Robin%"))
            )
            .options(
                selectinload(User.roles).selectinload(UserRole.role),
                selectinload(User.group)
            )
        )
        result = await db.execute(query)
        users = result.scalars().all()

        if not users:
            print("No se encontró al usuario Marcos Robin.")
            return

        for u in users:
            print(f"Usuario: {u.first_name} {u.last_name} ({u.username})")
            print(f"  - ID: {u.id}")
            print(f"  - Superuser: {u.is_superuser}")
            print(f"  - Group: {u.group.name if u.group else 'Sin Grupo'}")
            
            if u.roles:
                print("  - Roles asignados en DB:")
                for ur in u.roles:
                    if ur.role:
                        print(f"    * {ur.role.name} (ID: {ur.role.id})")
                    else:
                        print(f"    * Rol ID {ur.role_id} (No existe en tabla roles)")
            else:
                print("  - Roles: Ninguno asignado explícitamente.")

if __name__ == "__main__":
    asyncio.run(inspect_marcos())

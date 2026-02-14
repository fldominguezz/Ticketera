import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.db.models.iam import UserRole, Role
import sys
import os

sys.path.append(os.getcwd())

async def audit_users():
    async with AsyncSessionLocal() as db:
        print(f"{'USUARIO':<15} | {'GRUPO':<30} | {'ROLES':<30}")
        print("-" * 80)
        q = select(User).options(selectinload(User.group), selectinload(User.roles).selectinload(UserRole.role))
        res = await db.execute(q)
        users = res.scalars().all()
        for u in users:
            roles = ", ".join([r.role.name for r in u.roles if r.role])
            group_name = u.group.name if u.group else "Sin Grupo"
            print(f"{u.username:<15} | {group_name:<30} | {roles:<30}")

if __name__ == "__main__":
    asyncio.run(audit_users())

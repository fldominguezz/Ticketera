import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.db.models.iam import UserRole, Role
import sys
import os

sys.path.append(os.getcwd())

async def check_user_access():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.username == "ccsbaglia"))
        u = res.scalar_one_or_none()
        if u:
            res_role = await db.execute(select(Role).join(UserRole).where(UserRole.user_id == u.id))
            roles = [r.name for r in res_role.scalars().all()]
            print(f"User: {u.username} | Roles: {roles}")
        else:
            print("User not found")

if __name__ == "__main__":
    asyncio.run(check_user_access())

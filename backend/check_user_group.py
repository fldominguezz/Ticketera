import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
import sys
import os

sys.path.append(os.getcwd())

async def check_group():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).options(selectinload(User.group)).where(User.username == "ccsbaglia"))
        u = res.scalar_one_or_none()
        if u:
            print(f"User: {u.username} | GroupID: {u.group_id} | GroupName: {u.group.name if u.group else 'NONE'}")
        else:
            print("User not found")

if __name__ == "__main__":
    asyncio.run(check_group())

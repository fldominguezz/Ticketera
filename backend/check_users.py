import asyncio
import sys
import os

sys.path.append(os.getcwd())

from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from sqlalchemy.future import select

async def run():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        for u in users:
            print(f"USER: {u.username} - Superuser: {u.is_superuser} - Active: {u.is_active}")

if __name__ == "__main__":
    asyncio.run(run())

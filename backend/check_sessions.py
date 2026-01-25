import asyncio
import sys
import os

sys.path.append(os.getcwd())

from app.db.session import AsyncSessionLocal
from app.db.models.session import Session
from sqlalchemy.future import select

async def run():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Session))
        sessions = result.scalars().all()
        print(f"FOUND_SESSIONS: {len(sessions)}")
        for s in sessions:
            print(f"SESSION: {s.id} - User: {s.user_id} - Active: {s.is_active}")

if __name__ == "__main__":
    asyncio.run(run())
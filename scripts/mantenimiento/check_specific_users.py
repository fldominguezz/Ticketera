import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
import sys
import os

sys.path.append(os.getcwd())

async def check_users():
    async with AsyncSessionLocal() as db:
        print("Checking specific users...")
        for username in ["jzarate", "ccsbaglia"]:
            res = await db.execute(select(User).where(User.username == username))
            u = res.scalar_one_or_none()
            if u:
                print(f"User: {u.username} | Email: {u.email} | Active: {u.is_active} | Locked: {u.locked_until} | Failed: {u.failed_login_attempts}")
            else:
                print(f"User: {username} DOES NOT EXIST.")

if __name__ == "__main__":
    asyncio.run(check_users())

import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.core.security import get_password_hash
import sys
import os

sys.path.append(os.getcwd())

async def reset_passwords():
    async with AsyncSessionLocal() as db:
        new_hash = get_password_hash("Policia123")
        for username in ["jzarate", "ccsbaglia"]:
            res = await db.execute(select(User).where(User.username == username))
            u = res.scalar_one_or_none()
            if u:
                u.hashed_password = new_hash
                u.failed_login_attempts = 0
                u.locked_until = None
                print(f"Password reset for: {username}")
        await db.commit()

if __name__ == "__main__":
    asyncio.run(reset_passwords())

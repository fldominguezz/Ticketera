import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
import sys
import os

sys.path.append(os.getcwd())

async def disable_2fa_mandatory():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.username == "ccsbaglia"))
        u = res.scalar_one_or_none()
        if u:
            u.enroll_2fa_mandatory = False
            u.is_2fa_enabled = False
            u.reset_2fa_next_login = False
            print(f"2FA requirements DISABLED for {u.username}")
        await db.commit()

if __name__ == "__main__":
    asyncio.run(disable_2fa_mandatory())

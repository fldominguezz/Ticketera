import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
import sys
import os

sys.path.append(os.getcwd())

async def deep_diag():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.username == "ccsbaglia"))
        u = res.scalar_one_or_none()
        if u:
            print(f"--- DIAGNOSTICO: {u.username} ---")
            print(f"ID: {u.id}")
            print(f"Email: {u.email}")
            print(f"Is Active: {u.is_active}")
            print(f"Force Pwd Change: {u.force_password_change}")
            print(f"2FA Enabled: {u.is_2fa_enabled}")
            print(f"Enroll 2FA Mandatory: {u.enroll_2fa_mandatory if hasattr(u, 'enroll_2fa_mandatory') else 'N/A'}")
            print(f"Reset 2FA: {u.reset_2fa_next_login}")
            print(f"Failed Attempts: {u.failed_login_attempts}")
            print(f"Locked Until: {u.locked_until}")
        else:
            print("User ccsbaglia not found")

if __name__ == "__main__":
    asyncio.run(deep_diag())

import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.core.security import verify_password
import sys
import os

# Añadir el path para que encuentre el módulo app
sys.path.append(os.getcwd())

async def check_admin():
    async with AsyncSessionLocal() as db:
        print("Checking admin users...")
        result = await db.execute(select(User))
        users = result.scalars().all()
        for u in users:
            is_match = verify_password("admin123", u.hashed_password)
            print(f"User: {u.username} | Email: {u.email} | Superuser: {u.is_superuser} | Match 'admin123': {is_match}")

if __name__ == "__main__":
    asyncio.run(check_admin())

import asyncio
import os
import sys

sys.path.append(os.getcwd())
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from sqlalchemy import select

async def fix_perms():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User))
        users = res.scalars().all()
        for u in users:
            print(f"User: {u.email} | Superuser: {u.is_superuser}")
            if not u.is_superuser:
                print(f"Enabling superuser for {u.email}...")
                u.is_superuser = True
                db.add(u)
        await db.commit()
        print("Done.")

if __name__ == "__main__":
    asyncio.run(fix_perms())

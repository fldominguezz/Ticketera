import asyncio
import os
import sys
from passlib.context import CryptContext

sys.path.append(os.getcwd())
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from sqlalchemy import select

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def reset_admin():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.email == "admin@ticketera.com"))
        u = res.scalar_one_or_none()
        
        hashed = pwd_context.hash("adminpassword")
        
        if not u:
            print("Creating new admin user...")
            u = User(
                username="admin",
                email="admin@ticketera.com",
                hashed_password=hashed,
                first_name="Admin",
                last_name="SOC",
                is_active=True,
                is_superuser=True
            )
            db.add(u)
        else:
            print("Resetting existing admin password...")
            u.hashed_password = hashed
            u.is_active = True
            u.is_superuser = True
            db.add(u)
            
        await db.commit()
        print("Admin user is ready. Credentials: admin@ticketera.com / adminpassword")

if __name__ == "__main__":
    asyncio.run(reset_admin())

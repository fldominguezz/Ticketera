import asyncio
import logging
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.core.security import verify_password

async def test_passwords():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == "admin"))
        user = result.scalar_one_or_none()
        
        if not user:
            print("Admin user not found")
            return
            
        print(f"User: {user.username}")
        print(f"Current Hash: {user.hashed_password}")
        
        p1 = "admin123"
        p2 = "adminpassword"
        
        print(f"Testing '{p1}': {verify_password(p1, user.hashed_password)}")
        print(f"Testing '{p2}': {verify_password(p2, user.hashed_password)}")

if __name__ == "__main__":
    asyncio.run(test_passwords())

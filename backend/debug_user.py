import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from app.db.models import User
import os

# Assuming the script is run inside the docker container,
# the database host will be 'db' as defined in docker-compose.yml
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@db:5432/ticketera_db")

async def debug_user_status(username: str):
    engine = create_async_engine(DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).filter(User.username == username))
        user = result.scalar_one_or_none()

        if user:
            print(f"--- User '{username}' Status ---")
            print(f"ID: {user.id}")
            print(f"Email: {user.email}")
            print(f"Is Active: {user.is_active}")
            print(f"Is Superuser: {user.is_superuser}")
            print(f"Failed Login Attempts: {user.failed_login_attempts}")
            print(f"Locked Until: {user.locked_until}")
            print(f"Force Password Change: {user.force_password_change}")
            print(f"Reset 2FA Next Login: {user.reset_2fa_next_login}")
            print(f"Hashed Password (first 10 chars): {user.hashed_password[:10]}...")
            print("-----------------------------")
        else:
            print(f"User '{username}' not found.")

if __name__ == "__main__":
    asyncio.run(debug_user_status("admin"))

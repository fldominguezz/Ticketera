import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def list_tables():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
        tables = res.scalars().all()
        print("Tables:", tables)

if __name__ == "__main__":
    asyncio.run(list_tables())

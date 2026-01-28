import asyncio
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import json
import os
import sys

sys.path.append(os.getcwd())
from app.db.models.asset import Asset

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@db:5432/ticketera_db")

async def check_assets():
    engine = create_async_engine(DATABASE_URL)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        query = select(Asset.status, Asset.hostname, Asset.asset_tag)
        result = await session.execute(query)
        rows = result.fetchall()
        
        assets = []
        for row in rows:
            assets.append({
                "status": row.status,
                "hostname": row.hostname,
                "tag": row.asset_tag
            })
        
        print(json.dumps(assets, indent=2))

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_assets())

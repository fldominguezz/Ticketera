import asyncio
import os
import sys
import json

sys.path.append(os.getcwd())
from app.db.session import AsyncSessionLocal
from app.db.models.location import LocationNode
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(LocationNode.id, LocationNode.name))
        rows = res.fetchall()
        print(json.dumps([{"id": str(r.id), "name": r.name} for r in rows], indent=2))

if __name__ == "__main__":
    asyncio.run(check())

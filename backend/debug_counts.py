import asyncio
import os
import sys
import json

sys.path.append(os.getcwd())
from app.db.session import AsyncSessionLocal
from app.crud.crud_location import location
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as db:
        res = await location.get_all(db)
        print(json.dumps([{"name": r.name, "total": getattr(r, "total_assets", "N/A")} for r in res], indent=2))

if __name__ == "__main__":
    asyncio.run(check())

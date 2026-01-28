import asyncio
import os
import sys
import json

sys.path.append(os.getcwd())
from app.db.session import AsyncSessionLocal
from app.db.models.asset import Asset
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as db:
        # ID de 'pfa test' que obtuvimos antes
        pfa_id = '4c861bdc-33e8-491a-aac3-70d45d2ecbc0'
        res = await db.execute(select(Asset.hostname, Asset.status).where(Asset.location_node_id == pfa_id))
        rows = res.fetchall()
        print(json.dumps([{"hostname": r.hostname, "status": r.status} for r in rows], indent=2))

if __name__ == "__main__":
    asyncio.run(check())

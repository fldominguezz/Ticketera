import asyncio
import os
import sys
import json

sys.path.append(os.getcwd())
from app.db.session import AsyncSessionLocal
from app.db.models.location import LocationNode
from app.db.models.asset import Asset
from sqlalchemy import select, func

async def check():
    async with AsyncSessionLocal() as db:
        # Traer todas las carpetas
        res_loc = await db.execute(select(LocationNode.id, LocationNode.name, LocationNode.parent_id))
        locations = res_loc.fetchall()
        
        # Traer todos los activos y su ubicación
        res_ass = await db.execute(select(Asset.hostname, Asset.status, Asset.location_node_id))
        assets = res_ass.fetchall()
        
        data = {
            "locations": [{"id": str(l.id), "name": l.name, "parent": str(l.parent_id)} for l in locations],
            "assets": [{"hostname": a.hostname, "status": a.status, "loc": str(a.location_node_id)} for a in assets]
        }
        print(json.dumps(data, indent=2))

if __name__ == "__main__":
    asyncio.run(check())

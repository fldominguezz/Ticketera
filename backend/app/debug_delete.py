import asyncio
import sys
import os
from uuid import UUID
from sqlalchemy.future import select

# Ajustar path para importar app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal
from app.db.models.location import LocationNode
from app.db.models.asset import Asset
from app.crud.crud_location import location as crud_location

async def run_debug(loc_id_str):
    loc_id = UUID(loc_id_str)
    async with AsyncSessionLocal() as db:
        try:
            print(f"--- Debugging delete for {loc_id} ---")
            loc = await db.get(LocationNode, loc_id)
            if not loc:
                print("Location not found.")
                return

            print(f"Executing crud_location.delete...")
            # Probamos el delete real que falla
            res = await crud_location.delete(db, loc_id)
            print(f"Delete result: {res}")
            print("SUCCESS")
        except Exception as e:
            import traceback
            print("--- ERROR DETECTED ---")
            traceback.print_exc()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        asyncio.run(run_debug(sys.argv[1]))
    else:
        # Obtener una ID valida para probar
        async def get_id():
            async with AsyncSessionLocal() as db:
                res = await db.execute(select(LocationNode).limit(1))
                loc = res.scalar_one_or_none()
                if loc:
                    print(f"Suggested ID: {loc.id} ({loc.name})")
                else:
                    print("No locations found.")
        asyncio.run(get_id())

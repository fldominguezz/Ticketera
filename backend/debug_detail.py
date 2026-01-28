import asyncio
from sqlalchemy.ext.asyncio import create_async_session, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from app.db.session import engine
from app.db.models.asset import Asset
from app.db.models.location import LocationNode
from uuid import UUID

async def debug():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        asset_id = UUID('0c9cfc98-9875-4a56-96d4-ddafa26737c4')
        try:
            print(f"Buscando equipo {asset_id}...")
            # Simulando la consulta del router
            query = select(Asset).filter(Asset.id == asset_id)
            result = await db.execute(query)
            asset = result.scalar_one_or_none()
            
            if not asset:
                print("Error: Equipo no encontrado en DB")
                return

            print(f"Equipo encontrado: {asset.hostname}")
            print(f"Estado: {asset.status}")
            
            # Intentando acceder a relaciones (esto suele ser lo que falla)
            try:
                print(f"Ubicación ID: {asset.location_node_id}")
                # Forzar carga de ubicación
                loc_query = select(LocationNode).filter(LocationNode.id == asset.location_node_id)
                loc_res = await db.execute(loc_query)
                loc = loc_res.scalar_one_or_none()
                print(f"Ubicación nombre: {loc.name if loc else 'N/A'}")
            except Exception as e:
                print(f"FALLO EN RELACIONES: {str(e)}")

            # Simular construcción de respuesta
            res = {
                "id": str(asset.id),
                "hostname": asset.hostname,
                "status": asset.status,
                "ip_address": asset.ip_address
            }
            print("Construcción de respuesta OK")
            
        except Exception as e:
            import traceback
            print("--- TRACEBACK COMPLETO ---")
            print(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(debug())

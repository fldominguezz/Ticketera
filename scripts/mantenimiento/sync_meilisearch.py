import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
import meilisearch

# Ajustar path para importar app
sys.path.append("/app")

from app.db.models.ticket import Ticket
from app.db.models.asset import Asset

# Database URL de docker-compose
DATABASE_URL = "postgresql+asyncpg://user:password@db:5432/ticketing_dev_db"

async def sync_all():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # --- SYNC TICKETS ---
        print("Obteniendo tickets de la base de datos...")
        result = await session.execute(select(Ticket))
        tickets = result.scalars().all()
        print(f"Encontrados {len(tickets)} tickets.")

        ticket_docs = []
        for t in tickets:
            ticket_docs.append({
                "id": str(t.id),
                "title": t.title,
                "description": t.description or "",
                "status": t.status,
                "priority": t.priority,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "updated_at": t.updated_at.isoformat() if t.updated_at else None,
                "group_id": str(t.group_id) if t.group_id else None,
            })

        client = meilisearch.Client("http://meilisearch:7700", "masterKeyTicketeraSOC")
        
        if ticket_docs:
            print(f"Indexando {len(ticket_docs)} tickets en Meilisearch...")
            client.index("tickets").add_documents(ticket_docs)
            print("Tickets sincronizados.")

        # --- SYNC ASSETS ---
        print("Obteniendo activos de la base de datos...")
        result_assets = await session.execute(select(Asset))
        assets = result_assets.scalars().all()
        print(f"Encontrados {len(assets)} activos.")

        asset_docs = []
        for a in assets:
            asset_docs.append({
                "id": str(a.id),
                "hostname": a.hostname,
                "ip_address": a.ip_address,
                "mac_address": a.mac_address,
                "serial": a.serial,
                "asset_tag": a.asset_tag,
                "status": a.status,
                "criticality": a.criticality,
                "location_node_id": str(a.location_node_id) if a.location_node_id else None,
                "dependencia": a.dependencia,
                "codigo_dependencia": a.codigo_dependencia,
                "device_type": a.device_type,
                "last_seen": a.last_seen.isoformat() if a.last_seen else None
            })

        if asset_docs:
            print(f"Indexando {len(asset_docs)} activos en Meilisearch...")
            client.index("assets").add_documents(asset_docs)
            print("Activos sincronizados.")

if __name__ == "__main__":
    asyncio.run(sync_all())

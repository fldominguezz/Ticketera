import asyncio
import sys
import os
sys.path.append("/app")

from app.db.session import AsyncSessionLocal
from app.services.search_service import search_service
from sqlalchemy import select
from app.db.models.ticket import Ticket

async def fix_meili():
    print("🔍 Iniciando re-indexación de Meilisearch...")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Ticket))
        tickets = result.scalars().all()
        print(f"📊 Encontrados {len(tickets)} tickets en DB.")
        
        if tickets:
            print(f"🚀 Indexando {len(tickets)} tickets...")
            for ticket in tickets:
                await search_service.index_ticket(ticket)
            print("✅ Todos los tickets han sido indexados.")
        else:
            print("⚠️ No hay tickets para indexar.")

if __name__ == "__main__":
    asyncio.run(fix_meili())

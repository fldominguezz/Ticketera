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

# Database URL de docker-compose
DATABASE_URL = "postgresql+asyncpg://user:password@db:5432/ticketing_dev_db"

async def sync_all_tickets():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        print("Obteniendo tickets de la base de datos...")
        result = await session.execute(select(Ticket))
        tickets = result.scalars().all()
        print(f"Encontrados {len(tickets)} tickets.")

        documents = []
        for t in tickets:
            doc = {
                "id": str(t.id),
                "title": t.title,
                "description": t.description or "",
                "status": t.status,
                "priority": t.priority,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "updated_at": t.updated_at.isoformat() if t.updated_at else None,
                "group_id": str(t.group_id) if t.group_id else None,
            }
            documents.append(doc)

        if documents:
            print(f"Indexando {len(documents)} documentos en Meilisearch...")
            client = meilisearch.Client("http://meilisearch:7700", "masterKeyTicketeraSOC")
            index = client.index("tickets")
            index.add_documents(documents)
            print("Sincronización enviada con éxito.")
        else:
            print("No hay tickets para indexar.")

if __name__ == "__main__":
    asyncio.run(sync_all_tickets())

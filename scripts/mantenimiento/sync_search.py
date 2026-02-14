import asyncio
import logging
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.db.models.ticket import Ticket
from app.services.search_service import search_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def sync_tickets():
    logger.info("Iniciando sincronización de búsqueda...")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Ticket).filter(Ticket.deleted_at == None))
        tickets = result.scalars().all()
        
        count = 0
        for t in tickets:
            try:
                search_service.index_ticket({
                    "id": str(t.id),
                    "title": t.title,
                    "description": t.description,
                    "status": t.status,
                    "priority": t.priority,
                    "created_at": t.created_at
                })
                count += 1
            except Exception as e:
                logger.error(f"Error indexando ticket {t.id}: {e}")
        
        logger.info(f"Sincronización completada. {count} tickets indexados.")

if __name__ == "__main__":
    asyncio.run(sync_tickets())

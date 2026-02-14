
import asyncio
import uuid
import logging
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.db.models.ticket import Ticket
from app.services.sla_service import sla_service

logging.basicConfig(level=logging.INFO)

async def force_sla_refresh():
    async with AsyncSessionLocal() as db:
        # Procesar TODOS los tickets abiertos para asegurar que tengan métrica
        result = await db.execute(select(Ticket).filter(Ticket.status != 'closed', Ticket.deleted_at == None))
        tickets = result.scalars().all()
        
        print(f"Refrescando SLA para {len(tickets)} tickets...")
        
        for ticket in tickets:
            print(f"Procesando Ticket {ticket.id}...")
            await sla_service.assign_sla_to_ticket(db, ticket.id)
            
        print("✅ Refresco completado.")

if __name__ == "__main__":
    asyncio.run(force_sla_refresh())

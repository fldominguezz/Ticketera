import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models.ticket import Ticket, TicketType
import sys
import os

sys.path.append(os.getcwd())

async def debug_siem():
    async with AsyncSessionLocal() as db:
        print("--- Ticket Types ---")
        res_types = await db.execute(select(TicketType))
        types = res_types.scalars().all()
        for t in types:
            print(f"ID: {t.id} | Name: {t.name}")
            
        print("\n--- Sample Tickets ---")
        res_tickets = await db.execute(select(Ticket).limit(10))
        tickets = res_tickets.scalars().all()
        for t in tickets:
            print(f"Title: {t.title} | Status: {t.status} | TypeID: {t.ticket_type_id}")

if __name__ == "__main__":
    asyncio.run(debug_siem())

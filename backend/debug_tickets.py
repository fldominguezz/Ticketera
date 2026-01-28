import asyncio
import os
import sys

sys.path.append("/app")
from app.db.session import AsyncSessionLocal
from app.db.models.ticket import Ticket, TicketType
from app.db.models.group import Group
from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def check_tickets():
    async with AsyncSessionLocal() as db:
        query = select(Ticket).options(
            selectinload(Ticket.ticket_type),
            selectinload(Ticket.group)
        )
        result = await db.execute(query)
        tickets = result.scalars().all()
        
        print(f"Total tickets encontrados en DB: {len(tickets)}")
        for t in tickets:
            print(f"\n- [{t.id}] {t.title}")
            print(f"  Estado: {t.status}")
            print(f"  Tipo: {t.ticket_type.name if t.ticket_type else 'N/A'}")
            print(f"  Grupo: {t.group.name if t.group else 'N/A'} (ID: {t.group_id})")
            print(f"  Extra Data: {t.extra_data.keys() if t.extra_data else 'None'}")

if __name__ == "__main__":
    asyncio.run(check_tickets())

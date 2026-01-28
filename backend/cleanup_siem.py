import asyncio
from sqlalchemy import select, delete, and_, not_
from app.db.session import AsyncSessionLocal
from app.db.models.ticket import Ticket, TicketType

async def cleanup():
    async with AsyncSessionLocal() as db:
        # Find SIEM type id
        res = await db.execute(select(TicketType.id).where(TicketType.name.ilike('%SIEM%')))
        siem_id = res.scalar()
        
        if not siem_id:
            print("SIEM ticket type not found.")
            return

        # Delete tickets of type SIEM that are NOT "dispositivo dejo de enviar logs"
        # We use ilike to be safe with case and spaces
        query = delete(Ticket).where(
            and_(
                Ticket.ticket_type_id == siem_id,
                not_(Ticket.title.ilike('%dispositivo dejo de enviar logs%'))
            )
        )
        
        result = await db.execute(query)
        await db.commit()
        print(f"Deleted {result.rowcount} SIEM alerts.")

if __name__ == "__main__":
    asyncio.run(cleanup())

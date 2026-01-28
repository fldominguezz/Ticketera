import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import json
import os
import sys

sys.path.append(os.getcwd())
from app.db.models.integrations import SIEMRule, SIEMEvent
from app.db.models.ticket import Ticket, TicketType

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@db:5432/ticketera_db")

async def check_rules():
    engine = create_async_engine(DATABASE_URL)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        # Check Rules
        rules_query = select(SIEMRule)
        rules_result = await session.execute(rules_query)
        rules = rules_result.scalars().all()
        rules_list = [{"name": r.name, "pattern": r.event_pattern} for r in rules]
        
        # Check all SIEM events regardless of date
        events_query = select(SIEMEvent.event_type, SIEMEvent.created_at).limit(10)
        events_result = await session.execute(events_query)
        events = [{"type": row.event_type, "date": str(row.created_at)} for row in events_result]
        
        # Check Ticket Types names
        types_query = select(TicketType.name)
        types_result = await session.execute(types_query)
        types = types_result.scalars().all()

        print(json.dumps({
            "rules": rules_list,
            "sample_events": events,
            "ticket_types": types
        }, indent=2))

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_rules())

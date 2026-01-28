import asyncio
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import json
import os
import sys

sys.path.append(os.getcwd())
from app.db.models.ticket import Ticket, TicketType

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@db:5432/ticketera_db")

async def analyze_tickets():
    engine = create_async_engine(DATABASE_URL)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        # Join with TicketType
        query = select(
            TicketType.name,
            Ticket.title,
            Ticket.status,
            Ticket.created_at
        ).join(TicketType)
        
        result = await session.execute(query)
        rows = result.fetchall()
        
        analysis = {}
        for row in rows:
            type_name = row.name
            title = row.title
            status = row.status
            
            # Group by type and status
            if type_name not in analysis:
                analysis[type_name] = {"total": 0, "statuses": {}, "titles": {}}
            
            analysis[type_name]["total"] += 1
            analysis[type_name]["statuses"][status] = analysis[type_name]["statuses"].get(status, 0) + 1
            
            # Simple grouping by title prefix (first 20 chars)
            title_prefix = title[:40]
            analysis[type_name]["titles"][title_prefix] = analysis[type_name]["titles"].get(title_prefix, 0) + 1

        print(json.dumps(analysis, indent=2))

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(analyze_tickets())

import asyncio
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
import json

# Importar modelos (ajustando el path)
import sys
import os
sys.path.append(os.getcwd())

from app.db.models.ticket import Ticket, TicketType
from app.db.models.asset import Asset
from app.db.models.integrations import SIEMEvent

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@db:5432/ticketera_db")

async def get_stats():
    engine = create_async_engine(DATABASE_URL)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        # 1. Alertas SIEM en los últimos 30 días agrupadas por tipo
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        siem_query = select(
            SIEMEvent.event_type, 
            func.count(SIEMEvent.id).label('count')
        ).where(
            SIEMEvent.created_at >= thirty_days_ago
        ).group_by(SIEMEvent.event_type)
        
        siem_results = await session.execute(siem_query)
        siem_stats = {row.event_type: row.count for row in siem_results}
        
        # 2. Tickets por estado
        ticket_status_query = select(
            Ticket.status, 
            func.count(Ticket.id).label('count')
        ).group_by(Ticket.status)
        
        ticket_results = await session.execute(ticket_status_query)
        ticket_stats = {row.status: row.count for row in ticket_results}
        
        # 3. Total tickets "normales" (asumiendo que no son de tipo SIEM)
        # Primero buscamos el ID del tipo SIEM
        type_query = select(TicketType).where(TicketType.name.ilike('%SIEM%'))
        siem_type_result = await session.execute(type_query)
        siem_type_ids = [t.id for t in siem_type_result.scalars().all()]
        
        normal_tickets_query = select(func.count(Ticket.id)).where(Ticket.ticket_type_id.notin_(siem_type_ids))
        normal_count = await session.execute(normal_tickets_query)
        normal_total = normal_count.scalar()
        
        # 4. Equipos activos (operative)
        assets_active_query = select(func.count(Asset.id)).where(Asset.status == 'operative')
        assets_active_count = await session.execute(assets_active_query)
        assets_active_total = assets_active_count.scalar()
        
        # 5. Equipos pendientes de etiqueta (asset_tag is null or empty)
        assets_pending_tag_query = select(func.count(Asset.id)).where(
            (Asset.asset_tag == None) | (Asset.asset_tag == '')
        )
        assets_pending_tag_count = await session.execute(assets_pending_tag_query)
        assets_pending_tag_total = assets_pending_tag_count.scalar()

        stats = {
            "siem_alerts_30d": siem_stats,
            "ticket_status": ticket_stats,
            "normal_tickets_total": normal_total,
            "active_assets": assets_active_total,
            "assets_pending_tag": assets_pending_tag_total
        }
        
        print(json.dumps(stats, indent=2))

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(get_stats())

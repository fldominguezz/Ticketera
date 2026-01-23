from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from typing import Optional

from app.db.models.sla import SLAPolicy
from app.db.models.ticket import Ticket

class SLAService:
    async def get_policy_by_priority(self, db: AsyncSession, priority: str) -> Optional[SLAPolicy]:
        result = await db.execute(select(SLAPolicy).filter(SLAPolicy.priority == priority, SLAPolicy.is_active == True))
        return result.scalar_one_or_none()

    async def calculate_deadline(self, db: AsyncSession, priority: str, start_time: Optional[datetime] = None) -> Optional[datetime]:
        if not start_time:
            start_time = datetime.now()
            
        policy = await self.get_policy_by_priority(db, priority)
        if not policy:
            # Fallback por defecto si no hay política definida
            minutes = 1440 # 24 horas por defecto
            if priority == 'critical': minutes = 240 # 4h
            elif priority == 'high': minutes = 480 # 8h
            elif priority == 'medium': minutes = 1440 # 24h
            else: minutes = 2880 # 48h
            return start_time + timedelta(minutes=minutes)
            
        return start_time + timedelta(minutes=policy.resolution_time_goal)

    async def apply_sla_to_ticket(self, db: AsyncSession, ticket: Ticket):
        """Calcula y aplica el SLA deadline a un ticket basándose en su prioridad actual."""
        deadline = await self.calculate_deadline(db, ticket.priority, ticket.created_at)
        ticket.sla_deadline = deadline
        return ticket

sla_service = SLAService()

from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timedelta
import logging
from app.db.models.sla import SLAMetric
from app.db.models.ticket import Ticket

logger = logging.getLogger(__name__)

class SLAService:
    PRIORITY_CONFIG = {
        "low": {"response": 24, "resolution": 72},
        "medium": {"response": 8, "resolution": 48},
        "high": {"response": 2, "resolution": 8},
        "critical": {"response": 1, "resolution": 4}
    }

    async def calculate_deadline(self, db: AsyncSession, priority: str, type: str = "resolution") -> datetime:
        config = self.PRIORITY_CONFIG.get(priority.lower(), self.PRIORITY_CONFIG["medium"])
        hours = config.get(type, 24)
        return datetime.utcnow() + timedelta(hours=hours)

    async def apply_policy_to_ticket(self, db: AsyncSession, ticket: Ticket):
        config = self.PRIORITY_CONFIG.get(ticket.priority.lower(), self.PRIORITY_CONFIG["medium"])
        sla = SLAMetric(
            ticket_id=ticket.id,
            response_deadline=datetime.utcnow() + timedelta(hours=config["response"]),
            resolution_deadline=datetime.utcnow() + timedelta(hours=config["resolution"])
        )
        db.add(sla)
        ticket.sla_deadline = sla.resolution_deadline
        await db.commit()

    async def handle_status_change(self, db: AsyncSession, ticket_id: UUID, old_status: str, new_status: str):
        res = await db.execute(select(SLAMetric).where(SLAMetric.ticket_id == ticket_id))
        sla = res.scalar_one_or_none()
        if not sla: return

        pause_states = ['pending', 'waiting_info', 'on_hold']
        active_states = ['open', 'in_progress']
        now = datetime.utcnow()

        if new_status in pause_states and old_status not in pause_states:
            sla.last_paused_at = now
        elif new_status in active_states and old_status in pause_states:
            if sla.last_paused_at:
                paused_delta = now - sla.last_paused_at
                sla.total_paused_seconds += int(paused_delta.total_seconds())
                if sla.response_deadline and not sla.responded_at:
                    sla.response_deadline += paused_delta
                if sla.resolution_deadline and not sla.resolved_at:
                    sla.resolution_deadline += paused_delta
                
                res_t = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
                ticket = res_t.scalar_one_or_none()
                if ticket: ticket.sla_deadline = sla.resolution_deadline
                sla.last_paused_at = None

        if new_status == 'in_progress' and not sla.responded_at:
            sla.responded_at = now
            if sla.response_deadline and now > sla.response_deadline: sla.is_response_breached = True

        if new_status in ['resolved', 'closed'] and not sla.resolved_at:
            sla.resolved_at = now
            if sla.resolution_deadline and now > sla.resolution_deadline: sla.is_resolution_breached = True

        db.add(sla)
        await db.commit()

    async def update_sla_status(self, db: AsyncSession, ticket_id: UUID, action: str):
        pass

sla_service = SLAService()

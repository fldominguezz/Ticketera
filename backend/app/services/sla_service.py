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
        from app.db.models.sla import SLAPolicy
        from datetime import timezone
        # Buscar política que coincida con la prioridad
        res_p = await db.execute(
            select(SLAPolicy).filter(
                SLAPolicy.priority == ticket.priority.lower(),
                SLAPolicy.is_active == True
            ).limit(1)
        )
        policy = res_p.scalar_one_or_none()
        
        # Si no hay específica, buscar cualquier activa
        if not policy:
            res_any = await db.execute(select(SLAPolicy).filter(SLAPolicy.is_active == True).limit(1))
            policy = res_any.scalar_one_or_none()

        if not policy:
            # Si aún no hay políticas, no creamos métrica para evitar el NotNullViolation
            logger.warning(f"No active SLA Policy found for ticket {ticket.id}. Skipping metric creation.")
            return

        config = self.PRIORITY_CONFIG.get(ticket.priority.lower(), self.PRIORITY_CONFIG["medium"])
        now = datetime.now(timezone.utc)
        sla = SLAMetric(
            ticket_id=ticket.id,
            policy_id=policy.id,
            response_deadline=now + timedelta(hours=config["response"]),
            resolution_deadline=now + timedelta(hours=config["resolution"])
        )
        db.add(sla)
        ticket.sla_deadline = sla.resolution_deadline
        await db.commit()

    async def handle_status_change(self, db: AsyncSession, ticket_id: UUID, old_status: str, new_status: str):
        from datetime import timezone
        res = await db.execute(select(SLAMetric).where(SLAMetric.ticket_id == ticket_id))
        sla = res.scalar_one_or_none()
        if not sla: return

        pause_states = ['pending', 'waiting_info', 'on_hold']
        active_states = ['open', 'in_progress']
        now = datetime.now(timezone.utc) # Aware

        if new_status in pause_states and old_status not in pause_states:
            sla.last_paused_at = now
        elif new_status in active_states and old_status in pause_states:
            if sla.last_paused_at:
                # Asegurar que last_paused_at es aware para la resta
                lp_at = sla.last_paused_at
                if lp_at.tzinfo is None:
                    lp_at = lp_at.replace(tzinfo=timezone.utc)
                
                paused_delta = now - lp_at
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
            # Comparación segura
            rd = sla.response_deadline
            if rd and rd.tzinfo is None: rd = rd.replace(tzinfo=timezone.utc)
            if rd and now > rd: sla.is_response_breached = True

        if new_status in ['resolved', 'closed'] and not sla.resolved_at:
            sla.resolved_at = now
            # Comparación segura
            rsd = sla.resolution_deadline
            if rsd and rsd.tzinfo is None: rsd = rsd.replace(tzinfo=timezone.utc)
            if rsd and now > rsd: sla.is_resolution_breached = True

        db.add(sla)
        await db.commit()

    async def update_sla_status(self, db: AsyncSession, ticket_id: UUID, action: str):
        pass

sla_service = SLAService()

from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
import logging
from app.db.models.sla import SLAMetric
from app.db.models.ticket import Ticket
from app.services.notification_service import notification_service
logger = logging.getLogger(__name__)
class SLAMonitor:
    async def check_breaches(self, db: AsyncSession):
        """
        Busca tickets a punto de vencer (menos de 30 min) o ya vencidos.
        """
        now = datetime.utcnow()
        warning_window = now + timedelta(minutes=30)
        # 1. Vencimientos de RESPUESTA
        query_resp = select(SLAMetric).join(Ticket).where(
            and_(
                SLAMetric.responded_at == None,
                SLAMetric.response_deadline <= warning_window,
                Ticket.status != 'closed'
            )
        )
        metrics_resp = (await db.execute(query_resp)).scalars().all()
        for m in metrics_resp:
            await notification_service.notify_user(
                db,
                user_id=m.ticket.assigned_to_id or m.ticket.created_by_id,
                title="⚠️ SLA Respuesta Inminente",
                message=f"Ticket {m.ticket.id}: vence en <30 min.",
                link=f"/tickets/{m.ticket.id}"
            )
        # 2. Vencimientos de RESOLUCIÓN
        query_res = select(SLAMetric).join(Ticket).where(
            and_(
                SLAMetric.resolved_at == None,
                SLAMetric.resolution_deadline <= warning_window,
                Ticket.status != 'closed'
            )
        )
        metrics_res = (await db.execute(query_res)).scalars().all()
        for m in metrics_res:
            await notification_service.notify_user(
                db,
                user_id=m.ticket.assigned_to_id or m.ticket.created_by_id,
                title="🚨 SLA Resolución Crítica",
                message=f"El plazo de resolución del ticket {m.ticket.id} está por expirar.",
                link=f"/tickets/{m.ticket.id}"
            )
        await db.commit()
sla_monitor = SLAMonitor()

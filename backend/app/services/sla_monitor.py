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
        Busca tickets a punto de vencer (menos de 30 min) o ya vencidos 
        que no hayan sido notificados.
        """
        now = datetime.utcnow()
        warning_window = now + timedelta(minutes=30)

        # 1. Buscar vencimientos de RESPUESTA inminentes
        query = select(SLAMetric).join(Ticket).where(
            and_(
                SLAMetric.responded_at == None,
                SLAMetric.response_deadline <= warning_window,
                Ticket.status != 'closed'
            )
        )
        metrics = (await db.execute(query)).scalars().all()

        for m in metrics:
            await notification_service.notify_user(
                db,
                user_id=m.ticket.assigned_to_id or m.ticket.created_by_id,
                title="⚠️ Alerta de SLA: Respuesta",
                message=f"El ticket {m.ticket.title} vencerá en menos de 30 min.",
                link=f"/tickets/{m.ticket.id}"
            )
            logger.info(f"SLA Warning sent for Ticket {m.ticket.id}")

        await db.commit()

sla_monitor = SLAMonitor()

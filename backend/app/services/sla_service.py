from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from uuid import UUID

from app.db.models.sla import SLAPolicy, SLAMetric
from app.db.models.ticket import Ticket

class SLAService:
    async def apply_policy_to_ticket(self, db: AsyncSession, ticket: Ticket) -> Optional[SLAMetric]:
        """
        Busca la mejor política de SLA para el ticket y calcula los deadlines.
        """
        # Buscar política coincidente (Prioridad: Grupo + Tipo + Prioridad > Tipo + Prioridad > Prioridad)
        # Ejecutar búsqueda (simplificada: primera que coincida con prioridad y tipo)
        result = await db.execute(
            select(SLAPolicy).filter(
                SLAPolicy.is_active == True,
                SLAPolicy.priority == ticket.priority,
                or_(SLAPolicy.ticket_type_id == ticket.ticket_type_id, SLAPolicy.ticket_type_id == None)
            ).order_by(SLAPolicy.ticket_type_id.desc())
        )
        policy = result.scalars().first()
        
        if not policy:
            return None

        # Calcular deadlines (Simple: asumiendo 24/7 por ahora, 
        # extensible a business_hours en el futuro)
        created_at = ticket.created_at or datetime.utcnow()
        response_deadline = created_at + timedelta(minutes=policy.response_time_goal)
        resolution_deadline = created_at + timedelta(minutes=policy.resolution_time_goal)

        metric = SLAMetric(
            ticket_id=ticket.id,
            policy_id=policy.id,
            response_deadline=response_deadline,
            resolution_deadline=resolution_deadline
        )
        db.add(metric)
        await db.commit()
        return metric

    async def update_sla_status(self, db: AsyncSession, ticket_id: UUID, action: str):
        """
        Marca hitos de SLA: 'response' o 'resolution'.
        """
        result = await db.execute(select(SLAMetric).filter(SLAMetric.ticket_id == ticket_id))
        metric = result.scalar_one_or_none()
        if not metric: return

        now = datetime.utcnow()
        if action == "response" and not metric.responded_at:
            metric.responded_at = now
            metric.is_response_breached = now > metric.response_deadline
        elif action == "resolution" and not metric.resolved_at:
            metric.resolved_at = now
            metric.is_resolution_breached = now > metric.resolution_deadline
            
        await db.commit()

    async def calculate_deadline(self, db: AsyncSession, priority: str) -> datetime:
        # Fallback simple si no hay políticas complejas aun
        base_hours = {
            "critical": 4,
            "high": 24,
            "medium": 48,
            "low": 72
        }
        hours = base_hours.get(priority.lower(), 48)
        return datetime.utcnow() + timedelta(hours=hours)

sla_service = SLAService()
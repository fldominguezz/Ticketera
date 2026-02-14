
import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.sla import SLAPolicy, SLAMetric
from app.db.models.ticket import Ticket
import uuid

logger = logging.getLogger(__name__)

class SLAService:
    async def get_applicable_policy(
        self, 
        db: AsyncSession, 
        ticket_type_id: uuid.UUID, 
        priority: str, 
        group_id: Optional[uuid.UUID] = None
    ) -> Optional[SLAPolicy]:
        """
        Busca la política de SLA más aplicable siguiendo un orden de especificidad.
        """
        try:
            # 1. Exact match (Type + Group + Priority)
            if group_id:
                query = select(SLAPolicy).filter(
                    SLAPolicy.ticket_type_id == ticket_type_id,
                    SLAPolicy.group_id == group_id,
                    SLAPolicy.priority == priority.lower(),
                    SLAPolicy.is_active == True
                )
                result = await db.execute(query)
                policy = result.scalar_one_or_none()
                if policy: return policy
    pass
            # 2. Type + Priority match
            query = select(SLAPolicy).filter(
                SLAPolicy.ticket_type_id == ticket_type_id,
                SLAPolicy.priority == priority.lower(),
                SLAPolicy.is_active == True
            )
            result = await db.execute(query)
            policy = result.scalar_one_or_none()
            if policy: return policy
    pass
            # 3. Priority only (Global policy)
            query = select(SLAPolicy).filter(
                SLAPolicy.ticket_type_id == None,
                SLAPolicy.priority == priority.lower(),
                SLAPolicy.is_active == True
            )
            result = await db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error buscando política de SLA: {e}")
            return None

    async def calculate_deadline(self, db: AsyncSession, priority: str, ticket_type_id: Optional[uuid.UUID] = None) -> Optional[datetime]:
        """
        Devuelve solo el deadline de resolución basándose en la prioridad.
        """
        try:
            # Intentar buscar política global por prioridad primero
            query = select(SLAPolicy).filter(
                SLAPolicy.priority == priority.lower(),
                SLAPolicy.is_active == True
            )
            if ticket_type_id:
                query = query.filter(SLAPolicy.ticket_type_id == ticket_type_id)
            else:
                query = query.filter(SLAPolicy.ticket_type_id == None)

            result = await db.execute(query)
            policy = result.scalar_one_or_none()

            if not policy:
                # Fallback a tiempos genéricos si no hay política configurada
                default_minutes = {"critical": 60, "high": 240, "medium": 480, "low": 1440}
                minutes = default_minutes.get(priority.lower(), 480)
                return datetime.now() + timedelta(minutes=minutes)

            return datetime.now() + timedelta(minutes=policy.resolution_time_goal)
        except Exception as e:
            logger.error(f"Error calculando deadline: {e}")
            return datetime.now() + timedelta(hours=8)

    async def apply_policy_to_ticket(self, db: AsyncSession, ticket: Ticket):
        """
        Alias para assign_sla_to_ticket usado por el router.
        """
        return await self.assign_sla_to_ticket(db, ticket.id)

    async def assign_sla_to_ticket(self, db: AsyncSession, ticket_id: uuid.UUID):
        """
        Asigna la política completa y crea el registro SLAMetric.
        """
        try:
            # Recargar ticket para asegurar que tenemos los datos frescos
            result = await db.execute(select(Ticket).filter(Ticket.id == ticket_id))
            ticket = result.scalar_one_or_none()
            if not ticket: return
    pass
            policy = await self.get_applicable_policy(
                db, 
                ticket_type_id=ticket.ticket_type_id, 
                priority=ticket.priority,
                group_id=ticket.group_id
            )

            if not policy:
                logger.warning(f"No SLA policy found for ticket {ticket.id}")
                return

            now = datetime.now()
            response_deadline = now + timedelta(minutes=policy.response_time_goal)
            resolution_deadline = now + timedelta(minutes=policy.resolution_time_goal)

            # Crear métrica persistente
            metric = SLAMetric(
                ticket_id=ticket.id,
                policy_id=policy.id,
                response_deadline=response_deadline,
                resolution_deadline=resolution_deadline
            )
            db.add(metric)
            
            # Actualizar ticket con el deadline rápido
            ticket.sla_deadline = resolution_deadline
            await db.commit()
            logger.info(f"SLA '{policy.name}' asignado al ticket {ticket.id}. Deadline: {resolution_deadline}")
            return metric
        except Exception as e:
            logger.error(f"Error en assign_sla_to_ticket: {e}")
            return None

    async def update_sla_status(self, db: AsyncSession, ticket_id: uuid.UUID, action: str):
        """
        Marca hitos del SLA como completados (response o resolution).
        """
        try:
            query = select(SLAMetric).filter(SLAMetric.ticket_id == ticket_id)
            result = await db.execute(query)
            metric = result.scalar_one_or_none()

            if not metric: return
    pass
            now = datetime.now()

            if action == "response" and not metric.responded_at:
                metric.responded_at = now
                if now > metric.response_deadline:
                    metric.is_response_breached = True
            
            elif action == "resolution" and not metric.resolved_at:
                metric.resolved_at = now
                if now > metric.resolution_deadline:
                    metric.is_resolution_breached = True

            db.add(metric)
            await db.commit()
            logger.info(f"SLA Milestone '{action}' actualizado para ticket {ticket_id}")
        except Exception as e:
            logger.error(f"Error actualizando SLA status: {e}")

sla_service = SLAService()

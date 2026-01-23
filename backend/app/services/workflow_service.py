from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from uuid import UUID

from app.db.models.workflow import WorkflowTransition

class WorkflowService:
    async def get_allowed_transitions(self, db: AsyncSession, from_status: str) -> List[str]:
        """Devuelve una lista de estados a los que se puede pasar desde el estado actual."""
        result = await db.execute(
            select(WorkflowTransition.to_status).filter(WorkflowTransition.from_status == from_status)
        )
        allowed = result.scalars().all()
        # Si no hay reglas definidas, por defecto permitimos todo para no bloquear el sistema
        # Pero en un SOC real, si no hay regla, no hay paso.
        return allowed

    async def is_transition_allowed(self, db: AsyncSession, from_status: str, to_status: str) -> bool:
        if from_status == to_status:
            return True
            
        result = await db.execute(
            select(WorkflowTransition).filter(
                WorkflowTransition.from_status == from_status,
                WorkflowTransition.to_status == to_status
            )
        )
        transition = result.scalar_one_or_none()
        
        # Lógica de fallback: si la tabla está vacía, permitimos todo (fase inicial)
        all_rules = await db.execute(select(WorkflowTransition).limit(1))
        if not all_rules.scalar():
            return True
            
        return transition is not None

workflow_service = WorkflowService()

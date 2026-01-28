import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid

from app.db.session import AsyncSessionLocal
from app.crud.crud_user import user
from app.schemas.user import UserCreate
from app.db.models import Group, TicketType, User, SLAPolicy, WorkflowTransition, Workflow, WorkflowState
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_db() -> None:
    async with AsyncSessionLocal() as session:
        # 1. Create Default Group
        result = await session.execute(select(Group).filter(Group.name == "Admin"))
        group = result.scalar_one_or_none()
        if not group:
            group = Group(name="Admin", description="Administrators Group")
            session.add(group)
            await session.commit()
            await session.refresh(group)
            logger.info("Created Admin group")

        # 2. Create Superuser
        user_in = await user.get_by_email(session, email=settings.FIRST_SUPERUSER)
        if not user_in:
            user_in = UserCreate(
                email=settings.FIRST_SUPERUSER,
                username="admin",
                password=settings.FIRST_SUPERUSER_PASSWORD,
                is_superuser=True,
                group_id=group.id,
                first_name="Admin",
                last_name="System"
            )
            await user.create(session, obj_in=user_in)
            logger.info(f"Superuser created: {settings.FIRST_SUPERUSER}")
        else:
            logger.info("Superuser already exists")

        # 6. Ensure Workflow and Workflow States
        result = await session.execute(select(Workflow).filter(Workflow.name == "Default Ticket Workflow"))
        default_workflow = result.scalar_one_or_none()
        if not default_workflow:
            default_workflow = Workflow(name="Default Ticket Workflow", description="Workflow estándar para tickets.")
            session.add(default_workflow)
            await session.flush()
            logger.info("Default Workflow created")

        # Define default states
        states_data = [
            {"name": "Abierto", "status_key": "open", "color": "primary", "is_initial": True},
            {"name": "En Progreso", "status_key": "in_progress", "color": "info"},
            {"name": "Pendiente", "status_key": "pending", "color": "warning"},
            {"name": "Resuelto", "status_key": "resolved", "color": "success"},
            {"name": "Cerrado", "status_key": "closed", "color": "dark", "is_final": True},
        ]

        state_map = {} 
        for sd in states_data:
            result = await session.execute(select(WorkflowState).filter(
                WorkflowState.workflow_id == default_workflow.id,
                WorkflowState.status_key == sd["status_key"]
            ))
            state = result.scalar_one_or_none()
            if not state:
                state = WorkflowState(workflow_id=default_workflow.id, **sd)
                session.add(state)
                await session.flush()
                logger.info(f"Workflow State {sd['name']} created")
            state_map[sd["status_key"]] = state

        # 7. Ensure Workflow Transitions
        transitions = [
            ("open", "in_progress"),
            ("in_progress", "pending"),
            ("pending", "in_progress"),
            ("in_progress", "resolved"),
            ("resolved", "closed"),
            ("open", "closed"),
            ("resolved", "in_progress"),
            ("closed", "open"),
        ]
        
        for f_key, t_key in transitions:
            from_state = state_map.get(f_key)
            to_state = state_map.get(t_key)

            if not from_state or not to_state:
                continue

            result = await session.execute(
                select(WorkflowTransition).filter(
                    WorkflowTransition.workflow_id == default_workflow.id,
                    WorkflowTransition.from_state_id == from_state.id,
                    WorkflowTransition.to_state_id == to_state.id
                )
            )
            if not result.scalar_one_or_none():
                session.add(WorkflowTransition(
                    workflow_id=default_workflow.id,
                    from_state_id=from_state.id,
                    to_state_id=to_state.id,
                    name=f"{from_state.name} to {to_state.name}"
                ))
                logger.info(f"Transition {f_key} -> {t_key} created")
        
        await session.commit()

if __name__ == "__main__":
    asyncio.run(init_db())

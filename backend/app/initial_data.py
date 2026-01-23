import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid

from app.db.session import AsyncSessionLocal
from app.crud.crud_user import user
from app.schemas.user import UserCreate
from app.db.models import Group, TicketType, User, SLAPolicy, WorkflowTransition

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_db() -> None:
    async with AsyncSessionLocal() as session:
        # 1. Ensure Root Group
        root_group_name = "División Seguridad Informática"
        result = await session.execute(select(Group).filter(Group.name == root_group_name))
        root_group = result.scalar_one_or_none()
        if not root_group:
            root_group = Group(id=uuid.uuid4(), name=root_group_name, description="Grupo raíz.")
            session.add(root_group)
            await session.flush()
            logger.info("Root group created")

        # 2. Ensure Admin User
        db_user = await user.get_by_email(session, email="admin@ticketera.com")
        if not db_user:
            user_in = UserCreate(
                username="admin",
                email="admin@ticketera.com",
                password="adminpassword",
                first_name="Admin",
                last_name="Superuser",
                is_superuser=True,
                group_id=root_group.id
            )
            db_user = await user.create(session, obj_in=user_in)
            logger.info("Admin user created")

        # 3. Ensure System User (for integrations)
        system_user = await user.get_by_username(session, username="system")
        if not system_user:
            user_in = UserCreate(
                username="system",
                email="system@ticketera.com",
                password=str(uuid.uuid4()), # Random password
                first_name="System",
                last_name="Integration",
                is_active=True,
                is_superuser=False,
                group_id=root_group.id
            )
            system_user = await user.create(session, obj_in=user_in)
            logger.info("System user created")

        # 4. Ensure Ticket Types
        types = [
            {"name": "Instalación AV", "color": "blue"},
            {"name": "Alerta FortiSIEM", "color": "red"},
            {"name": "Incidente SOC", "color": "orange"},
            {"name": "Requerimiento", "color": "green"},
            {"name": "Informativo", "color": "grey"},
        ]
        for t in types:
            result = await session.execute(select(TicketType).filter(TicketType.name == t["name"]))
            if not result.scalar_one_or_none():
                session.add(TicketType(name=t["name"], color=t["color"]))
                logger.info(f"Ticket type {t['name']} created")

        # 5. Ensure SLA Policies
        slas = [
            {"name": "Critical Incidents", "priority": "critical", "resp": 15, "resol": 240},
            {"name": "High Priority", "priority": "high", "resp": 30, "resol": 480},
            {"name": "Standard Service", "priority": "medium", "resp": 120, "resol": 1440},
            {"name": "Non-Urgent", "priority": "low", "resp": 480, "resol": 2880},
        ]
        for s in slas:
            result = await session.execute(select(SLAPolicy).filter(SLAPolicy.priority == s["priority"]))
            if not result.scalar_one_or_none():
                session.add(SLAPolicy(
                    name=s["name"], 
                    priority=s["priority"], 
                    response_time_goal=s["resp"], 
                    resolution_time_goal=s["resol"]
                ))
                logger.info(f"SLA Policy {s['priority']} created")

        # 6. Ensure Workflow Transitions
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
        for f, t in transitions:
            result = await session.execute(
                select(WorkflowTransition).filter(
                    WorkflowTransition.from_status == f, 
                    WorkflowTransition.to_status == t
                )
            )
            if not result.scalar_one_or_none():
                session.add(WorkflowTransition(from_status=f, to_status=t))
                logger.info(f"Transition {f} -> {t} created")

        await session.commit()

if __name__ == "__main__":
    asyncio.run(init_db())
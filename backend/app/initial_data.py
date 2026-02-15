import asyncio
import logging
import csv
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
import uuid
from app.db.session import AsyncSessionLocal
from app.crud.crud_user import user
from app.schemas.user import UserCreate
from app.db.models import Group, User, SLAPolicy, WorkflowTransition, Workflow, WorkflowState, LocationNode, SIEMConfiguration
from app.db.models.iam import Role, Permission, UserRole, RolePermission
from app.core.config import settings
from app.core.permissions import PermissionEnum, ALL_PERMISSIONS
from app.db.models.ticket import Ticket as TicketModel, TicketType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_siem_config(session: AsyncSession, siem_user: User, group_objs: dict, default_workflow_id: uuid.UUID) -> None:
    """Asegura la configuración de integración del SIEM."""
    res_tt = await session.execute(select(TicketType).filter(TicketType.name == "ALERTA SIEM"))
    ttype = res_tt.scalar_one_or_none()
    if not ttype:
        ttype = TicketType(id=uuid.uuid4(), name="ALERTA SIEM", description="Alerta automática", icon="shield", color="warning", workflow_id=default_workflow_id)
        session.add(ttype)
        await session.flush()

    siem_api_password = os.getenv("SIEM_API_PASSWORD", "!zmXwu*gEg0@")
    res_config = await session.execute(select(SIEMConfiguration).limit(1))
    config = res_config.scalar_one_or_none()
    
    if not config:
        config = SIEMConfiguration(
            id=uuid.uuid4(),
            siem_user_id=siem_user.id,
            default_group_id=group_objs["Area SOC"].id,
            ticket_type_id=ttype.id,
            api_username=siem_user.email,
            api_password=siem_api_password,
            allowed_ips="10.1.78.10",
            is_active=True
        )
        session.add(config)
    else:
        config.siem_user_id = siem_user.id
        config.default_group_id = group_objs["Area SOC"].id
        config.ticket_type_id = ttype.id
        config.api_username = siem_user.email
        config.api_password = siem_api_password
        session.add(config)
    
    await session.commit()

async def init_locations(session: AsyncSession) -> None:
    csv_path = "/app/dependencias.csv"
    if not os.path.exists(csv_path):
        return
    
    # ... (Simplified for this script or use original if complex)
    pass

async def init_db() -> None:
    async with AsyncSessionLocal() as session:
        # 1. Create Hierarchical Groups
        res_admin = await session.execute(select(Group).filter(Group.name == "Administración"))
        g_admin = res_admin.scalar_one_or_none()
        if not g_admin:
            g_admin = Group(id=uuid.uuid4(), name="Administración", description="Grupo Raíz")
            session.add(g_admin)
            await session.flush()

        res_dsin = await session.execute(select(Group).filter(Group.name == "Div Seguridad Informatica"))
        g_dsin = res_dsin.scalar_one_or_none()
        if not g_dsin:
            g_dsin = Group(id=uuid.uuid4(), name="Div Seguridad Informatica", parent_id=g_admin.id)
            session.add(g_dsin)
            await session.flush()

        subgroups = ["Area SOC", "Area Tecnica", "Area Concientizacion", "Area Administrativa"]
        group_objs = {"Admin": g_admin, "DSIN": g_dsin}
        for name in subgroups:
            res_sg = await session.execute(select(Group).filter(Group.name == name))
            g_sg = res_sg.scalar_one_or_none()
            if not g_sg:
                g_sg = Group(id=uuid.uuid4(), name=name, parent_id=g_dsin.id)
                session.add(g_sg)
                await session.flush()
            group_objs[name] = g_sg

        # 2. Permissions
        permission_map = {}
        for perm_key in ALL_PERMISSIONS:
            result = await session.execute(select(Permission).filter(Permission.key == perm_key))
            permission = result.scalar_one_or_none()
            if not permission:
                permission = Permission(id=uuid.uuid4(), key=perm_key, name=perm_key, module=perm_key.split(":")[0])
                session.add(permission)
                await session.flush()
            permission_map[perm_key] = permission

        # 3. Roles
        result = await session.execute(select(Role).filter(Role.name == "SuperAdmin"))
        role_sa = result.scalar_one_or_none()
        if not role_sa:
            role_sa = Role(id=uuid.uuid4(), name="SuperAdmin", description="Acceso Total")
            session.add(role_sa)
            await session.flush()
            for p in permission_map.values():
                session.add(RolePermission(role_id=role_sa.id, permission_id=p.id))

        await session.commit()

        # 4. Superuser
        superuser = await user.get_by_email(session, email=settings.FIRST_SUPERUSER)
        if not superuser:
            user_in = UserCreate(
                email=settings.FIRST_SUPERUSER, username="admin", 
                password=settings.FIRST_SUPERUSER_PASSWORD, is_superuser=True,
                group_id=g_admin.id, first_name="Admin", last_name="User",
                role_ids=[role_sa.id]
            )
            superuser = await user.create(session, obj_in=user_in)

        # 5. SIEM User
        siem_email = "fortisiem@example.com"
        siem_user = await user.get_by_email(session, email=siem_email)
        siem_pass = os.getenv("SIEM_API_PASSWORD", "!zmXwu*gEg0@")
        if not siem_user:
            siem_in = UserCreate(
                email=siem_email, username="fortisiem", password=siem_pass,
                is_superuser=False, group_id=group_objs["Area SOC"].id,
                first_name="FortiSIEM", last_name="Connector", role_ids=[]
            )
            siem_user = await user.create(session, obj_in=siem_in)
        else:
            from app.core.security import get_password_hash
            siem_user.hashed_password = get_password_hash(siem_pass)
            session.add(siem_user)

        # 6. Workflow
        result = await session.execute(select(Workflow).filter(Workflow.name == "Default Ticket Workflow"))
        wf = result.scalar_one_or_none()
        if not wf:
            wf = Workflow(id=uuid.uuid4(), name="Default Ticket Workflow")
            session.add(wf)
            await session.flush()
        
        # 7. SIEM Config
        await init_siem_config(session, siem_user, group_objs, wf.id)
        
        # 8. SLA Policies
        for prio, times in [("critical", 60), ("high", 120), ("medium", 480), ("low", 1440)]:
            res_sla = await session.execute(select(SLAPolicy).filter(SLAPolicy.priority == prio))
            if not res_sla.scalar_one_or_none():
                session.add(SLAPolicy(
                    id=uuid.uuid4(), name=f"SLA {prio.title()}", priority=prio,
                    response_time_goal=15 if prio=="critical" else 60,
                    resolution_time_goal=times, is_active=True
                ))

        await session.commit()
        logger.info("Init DB successful")

if __name__ == "__main__":
    asyncio.run(init_db())

import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid
from datetime import datetime, timedelta

from app.db.session import AsyncSessionLocal
from app.crud.crud_user import user
from app.schemas.user import UserCreate
from app.db.models import Group, User, SLAPolicy, WorkflowTransition, Workflow, WorkflowState, TicketType
from app.db.models.iam import Role, Permission, UserRole, RolePermission
from app.core.config import settings
from app.core.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def restore_all():
    async with AsyncSessionLocal() as session:
        # 1. Create Essential Groups
        groups_to_create = [
            {"name": "Administración", "description": "Gestión total del sistema"},
            {"name": "Seguridad", "description": "División de Seguridad Informática (SOC)"},
            {"name": "Soporte N1", "description": "Atención inicial y triaje"},
            {"name": "Soporte N2", "description": "Resolución técnica avanzada"}
        ]
        
        group_map = {}
        for g_data in groups_to_create:
            res = await session.execute(select(Group).filter(Group.name == g_data["name"]))
            g = res.scalar_one_or_none()
            if not g:
                g = Group(id=uuid.uuid4(), **g_data)
                session.add(g)
                await session.flush()
                logger.info(f"Grupo creado: {g.name}")
            group_map[g_data["name"]] = g

        # 2. Create Permissions
        permissions_list = [
            {"key": "iam:manage:roles", "name": "Gestionar Roles", "module": "admin"},
            {"key": "iam:manage:users", "name": "Gestionar Usuarios", "module": "admin"},
            {"key": "ticket:create", "name": "Crear Tickets", "module": "tickets"},
            {"key": "ticket:read:all", "name": "Leer todos los tickets", "module": "tickets"},
            {"key": "ticket:update:all", "name": "Actualizar todos los tickets", "module": "tickets"},
            {"key": "siem:receive", "name": "Recibir alertas SIEM", "module": "integrations"}
        ]
        
        perm_map = {}
        for p_data in permissions_list:
            res = await session.execute(select(Permission).filter(Permission.key == p_data["key"]))
            p = res.scalar_one_or_none()
            if not p:
                p = Permission(id=uuid.uuid4(), **p_data)
                session.add(p)
                await session.flush()
            perm_map[p_data["key"]] = p

        # 3. Create Roles
        roles_to_create = [
            {"name": "Administrator", "description": "Control total"},
            {"name": "SOC Analyst", "description": "Analista de Seguridad"},
            {"name": "Integración SIEM", "description": "Usuario para Webhooks"}
        ]
        
        role_map = {}
        for r_data in roles_to_create:
            res = await session.execute(select(Role).filter(Role.name == r_data["name"]))
            r = res.scalar_one_or_none()
            if not r:
                r = Role(id=uuid.uuid4(), **r_data)
                session.add(r)
                await session.flush()
                # Assign all perms to Admin
                if r.name == "Administrator":
                    for p in perm_map.values():
                        session.add(RolePermission(role_id=r.id, permission_id=p.id))
            role_map[r_data["name"]] = r

        # 4. Create Special Users
        # test_admin
        test_admin = await user.get_by_username(session, username="test_admin")
        if not test_admin:
            u_in = UserCreate(
                email="test_admin@example.com",
                username="test_admin",
                password="testpassword123",
                is_superuser=True,
                group_id=group_map["Administración"].id,
                first_name="Test",
                last_name="Admin",
                role_ids=[role_map["Administrator"].id]
            )
            await user.create(session, obj_in=u_in)
            logger.info("Usuario test_admin creado.")

        # fortisiem
        fortisiem = await user.get_by_email(session, email="fortisiem@example.com")
        if not fortisiem:
            u_in = UserCreate(
                email="fortisiem@example.com",
                username="fortisiem",
                password="9y\;)P[s}obNd3W-",
                is_superuser=False,
                group_id=group_map["Seguridad"].id,
                first_name="FortiSIEM",
                last_name="Integration",
                role_ids=[role_map["Integración SIEM"].id]
            )
            await user.create(session, obj_in=u_in)
            logger.info("Usuario fortisiem@example.com creado.")

        # 5. Create Ticket Types
        types_list = ["Incidente SIEM", "Requerimiento", "Hardware", "Accesos"]
        for t_name in types_list:
            res = await session.execute(select(TicketType).filter(TicketType.name == t_name))
            if not res.scalar_one_or_none():
                session.add(TicketType(id=uuid.uuid4(), name=t_name, description=f"Tipo {t_name}"))
                logger.info(f"Tipo de ticket creado: {t_name}")

        # 6. Create SLA Policies
        slas = [
            {"name": "Crítico (2h)", "priority": "critical", "response_time_goal": 30, "resolution_time_goal": 120},
            {"name": "Alta (4h)", "priority": "high", "response_time_goal": 60, "resolution_time_goal": 240},
            {"name": "Media (8h)", "priority": "medium", "response_time_goal": 120, "resolution_time_goal": 480},
            {"name": "Baja (24h)", "priority": "low", "response_time_goal": 240, "resolution_time_goal": 1440}
        ]
        for s_data in slas:
            res = await session.execute(select(SLAPolicy).filter(SLAPolicy.name == s_data["name"]))
            if not res.scalar_one_or_none():
                session.add(SLAPolicy(id=uuid.uuid4(), **s_data, is_active=True))
                logger.info(f"SLA creado: {s_data['name']}")

        # 7. Workflow Setup
        res = await session.execute(select(Workflow).filter(Workflow.name == "Standard Workflow"))
        wf = res.scalar_one_or_none()
        if not wf:
            wf = Workflow(id=uuid.uuid4(), name="Standard Workflow", description="Workflow base")
            session.add(wf)
            await session.flush()
            
            states = [
                {"name": "Abierto", "status_key": "open", "color": "primary", "is_initial": True},
                {"name": "En Análisis", "status_key": "in_analysis", "color": "info"},
                {"name": "Resuelto", "status_key": "resolved", "color": "success"},
                {"name": "Cerrado", "status_key": "closed", "color": "secondary", "is_final": True}
            ]
            
            state_objs = {}
            for s_data in states:
                s = WorkflowState(id=uuid.uuid4(), workflow_id=wf.id, **s_data)
                session.add(s)
                state_objs[s_data["status_key"]] = s
            
            await session.flush()
            # Basic transitions
            transitions = [
                ("open", "in_analysis"), ("in_analysis", "resolved"), ("resolved", "closed")
            ]
            for f, t in transitions:
                session.add(WorkflowTransition(
                    id=uuid.uuid4(), workflow_id=wf.id, 
                    from_state_id=state_objs[f].id, to_state_id=state_objs[t].id,
                    name=f"De {f} a {t}"
                ))

        await session.commit()
        logger.info("✅ RESTAURACIÓN COMPLETA FINALIZADA.")

if __name__ == "__main__":
    asyncio.run(restore_all())

import asyncio
import logging
from uuid import UUID
from sqlalchemy.future import select
from sqlalchemy import delete

from app.db.session import AsyncSessionLocal, engine
from app.db.base import Base
from app.db.models.user import User
from app.db.models.group import Group
from app.db.models.iam import Role, Permission, RolePermission, UserRole
from app.db.models.password_policy import PasswordPolicy
from app.db.models.ticket import TicketType
from app.db.models.workflow import Workflow, WorkflowState, WorkflowTransition
from app.core.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("BOOTSTRAP_V2")

# --- CONFIGURACIÓN ---
CANONICAL_PERMISSIONS = [
    ("dashboard.view", "Ver dashboard"),
    ("dashboard.edit", "Editar dashboard"),
    ("users.read", "Listar usuarios"),
    ("users.create", "Crear usuarios"),
    ("users.update", "Editar usuarios"),
    ("users.delete", "Eliminar usuarios"),
    ("roles.read", "Ver roles"),
    ("roles.update", "Gestionar roles y permisos"),
    ("groups.read", "Ver grupos"),
    ("groups.update", "Gestionar jerarquía de grupos"),
    ("tickets.read", "Ver tickets"),
    ("tickets.create", "Crear tickets"),
    ("tickets.update", "Editar tickets"),
    ("tickets.close", "Cerrar tickets"),
    ("assets.read", "Ver inventario"),
    ("assets.create", "Crear activos"),
    ("assets.update", "Editar activos"),
    ("assets.delete", "Eliminar activos"),
    ("soc.read", "Ver monitor SIEM"),
    ("policy.read", "Ver política de seguridad"),
    ("policy.update", "Gestionar política de seguridad"),
    ("ticket_types.manage", "Gestionar tipos de ticket"),
    ("workflows.manage", "Gestionar flujos de trabajo")
]

async def bootstrap():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        logger.info("🚀 Iniciando Bootstrap Nivel 2...")

        # 1. Permisos
        perm_map = {}
        for p_name, p_desc in CANONICAL_PERMISSIONS:
            res = await db.execute(select(Permission).where(Permission.name == p_name))
            perm = res.scalar_one_or_none()
            if not perm:
                perm = Permission(name=p_name, description=p_desc)
                db.add(perm); await db.flush()
            perm_map[p_name] = perm.id

        # 2. Roles
        roles_list = ["SuperAdmin", "Administrator", "Division Seguridad Informatica", "Area SOC", "Area Tecnica", "Area Concientizacion", "Area Administrativa"]
        role_objs = {}
        for r_name in roles_list:
            res = await db.execute(select(Role).where(Role.name == r_name))
            role = res.scalar_one_or_none()
            if not role:
                role = Role(name=r_name, description=f"Rol para {r_name}")
                db.add(role); await db.flush()
            role_objs[r_name] = role

        # 3. SuperAdmin Perms
        super_role = role_objs["SuperAdmin"]
        for p_id in perm_map.values():
            res = await db.execute(select(RolePermission).where(RolePermission.role_id == super_role.id, RolePermission.permission_id == p_id))
            if not res.scalar_one_or_none():
                db.add(RolePermission(role_id=super_role.id, permission_id=p_id))

        # 4. WORKFLOWS
        # 4.1 Workflow Incidentes
        res_wf = await db.execute(select(Workflow).where(Workflow.name == "Workflow Incidentes"))
        wf_inc = res_wf.scalar_one_or_none()
        if not wf_inc:
            wf_inc = Workflow(name="Workflow Incidentes", description="Flujo para gestión de incidentes de seguridad")
            db.add(wf_inc); await db.flush()
            
            states = ["Nuevo", "Abierto", "En Proceso", "Resuelto", "Cerrado"]
            state_objs = {}
            for s_name in states:
                sk = s_name.lower().replace(" ", "_")
                st = WorkflowState(workflow_id=wf_inc.id, name=s_name, status_key=sk, is_initial=(s_name=="Nuevo"), is_final=(s_name=="Cerrado"))
                db.add(st); await db.flush()
                state_objs[s_name] = st
            
            transitions = [
                ("Nuevo", "Abierto"), ("Abierto", "En Proceso"), ("En Proceso", "Resuelto"), ("Resuelto", "Cerrado"),
                ("Resuelto", "En Proceso"), ("Cerrado", "En Proceso")
            ]
            for src, dst in transitions:
                db.add(WorkflowTransition(workflow_id=wf_inc.id, from_state_id=state_objs[src].id, to_state_id=state_objs[dst].id, name=f"{src}->{dst}"))

        # 4.2 Workflow Informativos
        res_wf2 = await db.execute(select(Workflow).where(Workflow.name == "Workflow Informativos"))
        wf_inf = res_wf2.scalar_one_or_none()
        if not wf_inf:
            wf_inf = Workflow(name="Workflow Informativos", description="Flujo para partes informativos")
            db.add(wf_inf); await db.flush()
            
            s_objs = {}
            for sn in ["Registrado", "Validado", "Archivado"]:
                sk = sn.lower().replace(" ", "_")
                st = WorkflowState(workflow_id=wf_inf.id, name=sn, status_key=sk, is_initial=(sn=="Registrado"), is_final=(sn=="Archivado"))
                db.add(st); await db.flush()
                s_objs[sn] = st
            
            for src, dst in [("Registrado", "Validado"), ("Validado", "Archivado")]:
                db.add(WorkflowTransition(workflow_id=wf_inf.id, from_state_id=s_objs[src].id, to_state_id=s_objs[dst].id, name=f"{src}->{dst}"))

        # 5. GRUPOS
        groups_struct = {
            "Administrator": {
                "Division Seguridad Informatica": [
                    "Area SOC", "Area Tecnica", "Area Concientizacion", "Area Administrativa"
                ]
            }
        }

        async def create_group_tree(struct, parent_id=None):
            for g_name, children in struct.items():
                res = await db.execute(select(Group).where(Group.name == g_name))
                group = res.scalar_one_or_none()
                if not group:
                    group = Group(name=g_name, parent_id=parent_id, description=f"Grupo {g_name}")
                    db.add(group); await db.flush()
                
                if isinstance(children, dict):
                    await create_group_tree(children, group.id)
                elif isinstance(children, list):
                    for child_name in children:
                        res_c = await db.execute(select(Group).where(Group.name == child_name))
                        if not res_c.scalar_one_or_none():
                            db.add(Group(name=child_name, parent_id=group.id, description=f"Grupo {child_name}"))

        await create_group_tree(groups_struct)
        await db.flush()

        # 6. TIPOS DE TICKET
        types = [
            ("Incidentes", "Incidentes de Seguridad y Respuesta", "#dc3545", wf_inc.id),
            ("Informativos", "Partes Diarios e Informativos", "#0d6efd", wf_inf.id)
        ]
        for tname, tdesc, tcolor, twf in types:
            res_t = await db.execute(select(TicketType).where(TicketType.name == tname))
            if not res_t.scalar_one_or_none():
                db.add(TicketType(name=tname, description=tdesc, color=tcolor, workflow_id=twf, requires_sla=True, has_severity=True))

        # 7. USUARIOS POR DEFECTO
        res_g = await db.execute(select(Group).where(Group.name == "Administrator"))
        admin_group = res_g.scalar_one()

        users_to_create = [
            {"u": "FortiSIEM", "e": "fortisiem@example.com", "p": "9y\;)P[s}obNd3W-"},
            {"u": "Admin", "e": "admin@example.com", "p": "admin123"}
        ]

        for u_data in users_to_create:
            res_u = await db.execute(select(User).where(User.username == u_data["u"]))
            user = res_u.scalar_one_or_none()
            if not user:
                user = User(
                    username=u_data["u"],
                    email=u_data["e"],
                    hashed_password=get_password_hash(u_data["p"]),
                    first_name=u_data["u"],
                    last_name="System",
                    is_active=True,
                    is_superuser=True,
                    group_id=admin_group.id,
                    policy_exempt=True,
                    force_password_change=False,
                    is_2fa_enabled=False
                )
                db.add(user); await db.flush()
                db.add(UserRole(user_id=user.id, role_id=super_role.id))
                logger.info(f"✅ Usuario creado: {u_data['u']} (@example.com)")

        # 8. POLITICA CONTRASEÑA
        res_p = await db.execute(select(PasswordPolicy).limit(1))
        if not res_p.scalar_one_or_none():
            db.add(PasswordPolicy(min_length=12, requires_uppercase=True, requires_lowercase=True, requires_number=True, requires_special_char=True, enforce_2fa_all=True))

        await db.commit()
        logger.info("🏁 BOOTSTRAP N2 FINALIZADO")

if __name__ == "__main__":
    asyncio.run(bootstrap())

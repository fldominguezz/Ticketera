import asyncio
import os
import sys
from uuid import uuid4

sys.path.append(os.getcwd())
from app.db.session import AsyncSessionLocal
from app.db.models.iam import Permission, Role, RolePermission
from sqlalchemy import select

async def seed_iam():
    async with AsyncSessionLocal() as db:
        # 1. Definir permisos básicos
        perms = [
            ("ticket:read", "Ver tickets operativos"),
            ("ticket:create", "Crear nuevos tickets"),
            ("ticket:update", "Editar tickets existentes"),
            ("ticket:delete", "Dar de baja tickets"),

            ("asset:read", "Ver inventario de equipos"),
            ("asset:create", "Registrar nuevos equipos"),
            ("asset:update", "Editar datos de equipos"),
            ("asset:delete", "Baja/Eliminar equipos"),
            ("asset_history:read", "Ver historial de cambios de equipos"),

            ("siem:read", "Ver eventos del SIEM"),
            ("siem:remediate", "Remediar eventos del SIEM"),

            ("audit_log:read", "Ver registros de auditoría"),

            ("endpoint:read", "Ver detalles de endpoints"),
            ("endpoint:create", "Crear nuevos endpoints"),
            ("endpoint:update", "Actualizar detalles de endpoints"),
            ("endpoint:delete", "Eliminar endpoints"),

            ("form:read", "Ver formularios"),
            ("form:create", "Crear formularios"),
            ("form:update", "Actualizar formularios"),
            ("form:delete", "Eliminar formularios"),

            ("group:read", "Ver grupos de usuarios"),
            ("group:create", "Crear grupos de usuarios"),
            ("group:update", "Actualizar grupos de usuarios"),
            ("group:delete", "Eliminar grupos de usuarios"),

            ("integration:read", "Ver configuraciones de integración"),
            ("integration:create", "Configurar nuevas integraciones"),
            ("integration:update", "Actualizar configuraciones de integración"),
            ("integration:delete", "Eliminar integraciones"),

            ("location:read", "Ver ubicaciones"),
            ("location:create", "Crear ubicaciones"),
            ("location:update", "Actualizar ubicaciones"),
            ("location:delete", "Eliminar ubicaciones"),

            ("notification:read", "Ver notificaciones"),
            ("notification:create", "Crear notificaciones"),
            ("notification:update", "Actualizar notificaciones"),
            ("notification:delete", "Eliminar notificaciones"),

            ("password_policy:read", "Ver política de contraseñas"),
            ("password_policy:update", "Actualizar política de contraseñas"),

            ("plugin:read", "Ver plugins"),
            ("plugin:create", "Instalar plugins"),
            ("plugin:update", "Actualizar plugins"),
            ("plugin:delete", "Desinstalar plugins"),

            ("session:read", "Ver sesiones de usuario"),
            ("session:delete", "Cerrar sesiones de usuario"),

            ("sla:read", "Ver políticas SLA"),
            ("sla:create", "Crear políticas SLA"),
            ("sla:update", "Actualizar políticas SLA"),
            ("sla:delete", "Eliminar políticas SLA"),
            
            ("user:read", "Ver detalles de usuarios"),
            ("user:create", "Crear usuarios"),
            ("user:update", "Actualizar usuarios"),
            ("user:delete", "Eliminar usuarios"),
            ("user:manage", "Gestionar usuarios y roles (Permiso amplio)"),

            ("workflow:read", "Ver flujos de trabajo"),
            ("workflow:create", "Crear flujos de trabajo"),
            ("workflow:update", "Actualizar flujos de trabajo"),
            ("workflow:delete", "Eliminar flujos de trabajo"),

            ("admin:access", "Acceso al panel de administración"),

            # Dashboard Permissions
            ("dashboard:view_global", "Ver dashboard global (División Seguridad)"),
            ("dashboard:view_siem", "Ver métricas de SIEM"),
            ("dashboard:view_inventory_stats", "Ver métricas de Inventario"),
        ]
        
        for p_name, p_desc in perms:
            res = await db.execute(select(Permission).where(Permission.name == p_name))
            if not res.scalar_one_or_none():
                p = Permission(name=p_name, description=p_desc)
                db.add(p)
        
        await db.flush()
        
        # --- Helper to assign permissions to role ---
        async def assign_perms_to_role(role_name, role_desc, perm_names):
            res_role = await db.execute(select(Role).where(Role.name == role_name))
            role = res_role.scalar_one_or_none()
            if not role:
                role = Role(id=uuid4(), name=role_name, description=role_desc)
                db.add(role)
                await db.flush()
                print(f"Role '{role_name}' created.")
            
            current_role_perms = await db.execute(select(RolePermission).where(RolePermission.role_id == role.id))
            current_perm_ids = [rp.permission_id for rp in current_role_perms.scalars().all()]

            for p_name in perm_names:
                res_perm = await db.execute(select(Permission).where(Permission.name == p_name))
                perm = res_perm.scalar_one_or_none()
                if perm and perm.id not in current_perm_ids:
                    rp = RolePermission(role_id=role.id, permission_id=perm.id)
                    db.add(rp)

        # 1. División Seguridad Informática (Super Admin equivalent)
        res_all_perms = await db.execute(select(Permission))
        all_perm_names = [p.name for p in res_all_perms.scalars().all()]
        await assign_perms_to_role("División Seguridad Informática", "Vista Global y Acceso Total", all_perm_names)

        # 2. Área SOC (RESTAURADO)
        soc_perms = [
            "ticket:read", "ticket:create", "ticket:update",
            "siem:read", "siem:remediate",
            "asset:read",
            "dashboard:view_siem", "dashboard:view_inventory_stats"
        ]
        await assign_perms_to_role("Área SOC", "Gestión de Incidentes y SIEM", soc_perms)

        # 3. Área Técnica
        tech_perms = [
            "ticket:read", "ticket:create", "ticket:update",
            "asset:read", "asset:create", "asset:update", "asset:delete", "asset_history:read",
            "location:read", "location:create", "location:update",
            "dashboard:view_inventory_stats"
        ]
        await assign_perms_to_role("Área Técnica", "Soporte en Sitio y Gestión de Activos", tech_perms)

        # 4. Concientización
        basic_perms = [
            "ticket:read", "ticket:create", "ticket:update"
        ]
        await assign_perms_to_role("Concientización", "Área de Concientización", basic_perms)

        # --- ELIMINACIÓN DE ROLES SOLICITADOS ---
        roles_to_delete = ["Administrador", "Administrador SOC", "Administrativa", "General"]
        for r_name in roles_to_delete:
            res_old = await db.execute(select(Role).where(Role.name == r_name))
            old_role = res_old.scalar_one_or_none()
            if old_role:
                await db.execute(RolePermission.__table__.delete().where(RolePermission.role_id == old_role.id))
                await db.delete(old_role)
                print(f"Role '{r_name}' deleted.")

        await db.commit()
        print("IAM Seeding complete (Restored Área SOC, deleted Administrador SOC).")

if __name__ == "__main__":
    asyncio.run(seed_iam())

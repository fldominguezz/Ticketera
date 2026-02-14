import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
import uuid

from app.db.session import AsyncSessionLocal
from app.db.models.iam import Role, Permission, RolePermission

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def repair_iam() -> None:
    async with AsyncSessionLocal() as session:
        # 1. Definir la lista maestra de permisos
        permissions_data = [
            {"key": "ticket:read:global", "name": "Leer Tickets Global", "module": "tickets", "scope_type": "global", "description": "Ver todos los tickets"},
            {"key": "ticket:read:group", "name": "Leer Tickets Grupo", "module": "tickets", "scope_type": "group", "description": "Ver tickets de su área"},
            {"key": "ticket:read:own", "name": "Leer Tickets Propios", "module": "tickets", "scope_type": "own", "description": "Ver tickets propios"},
            {"key": "ticket:create", "name": "Crear Tickets", "module": "tickets", "scope_type": "none", "description": "Crear incidentes"},
            {"key": "ticket:update:own", "name": "Editar Propios", "module": "tickets", "scope_type": "own", "description": "Modificar lo creado por uno"},
            {"key": "ticket:update:assigned", "name": "Editar Asignados", "module": "tickets", "scope_type": "own", "description": "Modificar lo asignado a uno"},
            {"key": "ticket:assign:group", "name": "Asignar en Grupo", "module": "tickets", "scope_type": "group", "description": "Asignar dentro del área"},
            {"key": "ticket:close:group", "name": "Cerrar en Grupo", "module": "tickets", "scope_type": "group", "description": "Finalizar tickets del área"},
            {"key": "ticket:update:bulk", "name": "Actualización Masiva", "module": "tickets", "scope_type": "none", "description": "Editar múltiples tickets"},
            {"key": "partes:read:global", "name": "Leer Partes Global", "module": "partes", "scope_type": "global", "description": "Ver todos los informes"},
            {"key": "partes:read:group", "name": "Leer Partes Grupo", "module": "partes", "scope_type": "group", "description": "Ver informes del área"},
            {"key": "partes:create", "name": "Cargar Partes", "module": "partes", "scope_type": "none", "description": "Generar informes de turno"},
            {"key": "admin:access", "name": "Acceso al Panel Admin", "module": "admin", "scope_type": "none", "description": "Acceso a administración"},
            {"key": "admin:users:read", "name": "Ver Usuarios", "module": "admin", "scope_type": "none", "description": "Listar usuarios"},
            {"key": "admin:users:manage", "name": "Gestionar Usuarios", "module": "admin", "scope_type": "none", "description": "Admin de usuarios"},
            {"key": "admin:roles:read", "name": "Ver Roles", "module": "admin", "scope_type": "none", "description": "Ver roles"},
            {"key": "admin:roles:manage", "name": "Gestionar Roles", "module": "admin", "scope_type": "none", "description": "Admin de roles"},
            {"key": "admin:groups:read", "name": "Ver Grupos", "module": "admin", "scope_type": "none", "description": "Ver grupos"},
            {"key": "admin:groups:manage", "name": "Gestionar Grupos", "module": "admin", "scope_type": "none", "description": "Admin de grupos"},
            {"key": "admin:catalogs:read", "name": "Ver Catálogos", "module": "admin", "scope_type": "none", "description": "Ver tipos/estados"},
            {"key": "admin:catalogs:manage", "name": "Gestionar Catálogos", "module": "admin", "scope_type": "none", "description": "Admin de catálogos"},
            {"key": "admin:settings:read", "name": "Ver Configuración", "module": "admin", "scope_type": "none", "description": "Ver ajustes"},
            {"key": "admin:settings:manage", "name": "Gestionar Configuración", "module": "admin", "scope_type": "none", "description": "Admin de ajustes"},
            {"key": "admin:locations:read", "name": "Ver Ubicaciones", "module": "admin", "scope_type": "none", "description": "Ver dependencias"},
            {"key": "admin:locations:manage", "name": "Gestionar Ubicaciones", "module": "admin", "scope_type": "none", "description": "Admin de dependencias"},
        ]

        # Sincronizar Permisos (Insert or Update)
        perm_map = {}
        for p in permissions_data:
            res = await session.execute(select(Permission).where(Permission.key == p["key"]))
            db_p = res.scalar_one_or_none()
            if not db_p:
                db_p = Permission(**p)
                session.add(db_p)
                await session.flush()
            else:
                for k,v in p.items(): setattr(db_p, k, v)
            perm_map[p["key"]] = db_p

        # Definir Roles
        roles_to_fix = {
            "AdminPanelFull": [p["key"] for p in permissions_data],
            "DSIN_Operativo_AdminParcial": [
                "ticket:read:global", "ticket:create", "ticket:update:assigned", "ticket:update:own",
                "ticket:assign:group", "ticket:close:group", "partes:read:global", "partes:create",
                "admin:access", "admin:locations:manage", "admin:locations:read",
                "admin:users:read", "admin:groups:read", "admin:catalogs:read"
            ],
            "Area_Operativa": [
                "ticket:read:group", "ticket:create", "ticket:update:own", "ticket:update:assigned",
                "partes:read:group", "partes:create"
            ],
            "UsuarioFinal": [
                "ticket:read:own", "ticket:create"
            ]
        }

        for r_name, p_keys in roles_to_fix.items():
            res = await session.execute(select(Role).where(Role.name == r_name))
            db_r = res.scalar_one_or_none()
            if not db_r:
                db_r = Role(name=r_name, description=f"Perfil {r_name}")
                session.add(db_r)
                await session.flush()
            
            # Limpiar y Re-asignar
            await session.execute(delete(RolePermission).where(RolePermission.role_id == db_r.id))
            for pk in p_keys:
                if pk in perm_map:
                    rp = RolePermission(role_id=db_r.id, permission_id=perm_map[pk].id)
                    session.add(rp)
        
        await session.commit()
        logger.info("✅ Matriz de Roles y Permisos REPARADA y vinculada.")

if __name__ == "__main__":
    asyncio.run(repair_iam())

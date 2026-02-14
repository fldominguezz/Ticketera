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

async def repair_iam_v2() -> None:
    async with AsyncSessionLocal() as session:
        # Definición con Módulos SECCIONADOS para el Panel Admin
        permissions_data = [
            # TICKETS
            {"key": "ticket:read:global", "name": "Leer Tickets Global", "module": "TICKETS: VISIBILIDAD", "scope_type": "global", "description": "Ver todos los tickets de la plataforma"},
            {"key": "ticket:read:group", "name": "Leer Tickets de mi Grupo", "module": "TICKETS: VISIBILIDAD", "scope_type": "group", "description": "Ver tickets de su área y descendientes"},
            {"key": "ticket:read:own", "name": "Leer Mis Tickets", "module": "TICKETS: VISIBILIDAD", "scope_type": "own", "description": "Ver solo tickets donde es creador o asignado"},
            {"key": "ticket:create", "name": "Crear Nuevos Tickets", "module": "TICKETS: OPERACIONES", "scope_type": "none", "description": "Capacidad de abrir nuevos incidentes"},
            {"key": "ticket:update:own", "name": "Editar Mis Tickets", "module": "TICKETS: OPERACIONES", "scope_type": "own", "description": "Modificar tickets creados por uno mismo"},
            {"key": "ticket:update:assigned", "name": "Editar Tickets Asignados", "module": "TICKETS: OPERACIONES", "scope_type": "own", "description": "Modificar tickets que tiene asignados"},
            {"key": "ticket:assign:group", "name": "Asignar dentro de Grupo", "module": "TICKETS: OPERACIONES", "scope_type": "group", "description": "Reasignar tickets entre miembros de su área"},
            {"key": "ticket:close:group", "name": "Cerrar Tickets de Grupo", "module": "TICKETS: OPERACIONES", "scope_type": "group", "description": "Finalizar incidentes de su área"},
            {"key": "ticket:update:bulk", "name": "Edición Masiva", "module": "TICKETS: OPERACIONES", "scope_type": "none", "description": "Cambiar estado/prioridad a múltiples tickets a la vez"},

            # PARTES
            {"key": "partes:read:global", "name": "Leer Todos los Partes", "module": "PARTES INFORMATIVOS", "scope_type": "global", "description": "Ver informes de todas las áreas"},
            {"key": "partes:read:group", "name": "Leer Partes de mi Grupo", "module": "PARTES INFORMATIVOS", "scope_type": "group", "description": "Ver informes de su área"},
            {"key": "partes:create", "name": "Cargar Nuevos Partes", "module": "PARTES INFORMATIVOS", "scope_type": "none", "description": "Generar informes de turno"},
            {"key": "partes:update:own", "name": "Editar Mis Partes", "module": "PARTES INFORMATIVOS", "scope_type": "own", "description": "Modificar informes cargados por uno"},

            # ADMIN: GENERAL
            {"key": "admin:access", "name": "Acceso a Administración", "module": "ADMIN: ACCESO", "scope_type": "none", "description": "Habilita la entrada al Panel Admin"},
            
            # ADMIN: USUARIOS
            {"key": "admin:users:read", "name": "Ver Lista de Usuarios", "module": "ADMIN: USUARIOS", "scope_type": "none", "description": "Listar cuentas de usuario del sistema"},
            {"key": "admin:users:manage", "name": "Gestión de Usuarios", "module": "ADMIN: USUARIOS", "scope_type": "none", "description": "Crear, editar, resetear claves y desactivar usuarios"},
            
            # ADMIN: ROLES
            {"key": "admin:roles:read", "name": "Ver Matriz de Roles", "module": "ADMIN: ROLES & PERMISOS", "scope_type": "none", "description": "Visualizar la configuración de permisos"},
            {"key": "admin:roles:manage", "name": "Gestión de Roles", "module": "ADMIN: ROLES & PERMISOS", "scope_type": "none", "description": "Crear roles y asignar capacidades (Diccionario)"},
            
            # ADMIN: GRUPOS
            {"key": "admin:groups:read", "name": "Ver Estructura Org.", "module": "ADMIN: GRUPOS", "scope_type": "none", "description": "Ver el árbol de grupos y áreas"},
            {"key": "admin:groups:manage", "name": "Gestión de Grupos", "module": "ADMIN: GRUPOS", "scope_type": "none", "description": "Crear y modificar la jerarquía organizacional"},
            
            # ADMIN: CATALOGOS
            {"key": "admin:catalogs:read", "name": "Ver Tipos y Estados", "module": "ADMIN: CATALOGOS & WORKFLOWS", "scope_type": "none", "description": "Ver configuración de tipos de tickets y flujos"},
            {"key": "admin:catalogs:manage", "name": "Gestión de Workflows", "module": "ADMIN: CATALOGOS & WORKFLOWS", "scope_type": "none", "description": "Modificar estados, transiciones y tipos de tickets"},
            
            # ADMIN: UBICACIONES
            {"key": "admin:locations:read", "name": "Ver Dependencias", "module": "ADMIN: UBICACIONES", "scope_type": "none", "description": "Listar ubicaciones y códigos de dependencia"},
            {"key": "admin:locations:manage", "name": "Gestión de Ubicaciones", "module": "ADMIN: UBICACIONES", "scope_type": "none", "description": "Crear, editar y organizar el árbol de dependencias"},
            
            # ADMIN: SISTEMA
            {"key": "admin:settings:read", "name": "Ver Ajustes Globales", "module": "ADMIN: SISTEMA", "scope_type": "none", "description": "Ver políticas de claves, backups y salud"},
            {"key": "admin:settings:manage", "name": "Gestión del Sistema", "module": "ADMIN: SISTEMA", "scope_type": "none", "description": "Modificar configuraciones críticas y realizar backups"},
        ]

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

        # Re-vincular roles principales
        roles_config = {
            "AdminPanelFull": [p["key"] for p in permissions_data],
            "DSIN_Operativo_AdminParcial": [
                "ticket:read:global", "ticket:create", "ticket:update:assigned", "ticket:update:own",
                "ticket:assign:group", "ticket:close:group", "partes:read:global", "partes:create",
                "admin:access", "admin:locations:manage", "admin:locations:read",
                "admin:users:read", "admin:groups:read", "admin:catalogs:read"
            ]
        }

        for r_name, p_keys in roles_config.items():
            res = await session.execute(select(Role).where(Role.name == r_name))
            db_r = res.scalar_one_or_none()
            if db_r:
                await session.execute(delete(RolePermission).where(RolePermission.role_id == db_r.id))
                for pk in p_keys:
                    if pk in perm_map:
                        rp = RolePermission(role_id=db_r.id, permission_id=perm_map[pk].id)
                        session.add(rp)
        
        await session.commit()
        logger.info("✅ Matriz SECCIONADA correctamente.")

if __name__ == "__main__":
    asyncio.run(repair_iam_v2())

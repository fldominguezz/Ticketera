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

async def setup_iam_rules() -> None:
    async with AsyncSessionLocal() as session:
        # 1. Definir todos los permisos granulares propuestos
        permissions_data = [
            # Tickets
            {"key": "ticket:read:global", "name": "Leer Tickets Global", "module": "tickets", "scope_type": "global", "description": "Ver todos los tickets del sistema"},
            {"key": "ticket:read:group", "name": "Leer Tickets Grupo", "module": "tickets", "scope_type": "group", "description": "Ver tickets de su área y subordinadas"},
            {"key": "ticket:read:own", "name": "Leer Tickets Propios", "module": "tickets", "scope_type": "own", "description": "Ver tickets donde es creador o asignado"},
            {"key": "ticket:create", "name": "Crear Tickets", "module": "tickets", "scope_type": "none", "description": "Crear nuevos incidentes"},
            {"key": "ticket:update:own", "name": "Editar Propios", "module": "tickets", "scope_type": "own", "description": "Modificar tickets creados por uno mismo"},
            {"key": "ticket:update:assigned", "name": "Editar Asignados", "module": "tickets", "scope_type": "own", "description": "Modificar tickets asignados a uno mismo"},
            {"key": "ticket:assign:group", "name": "Asignar en Grupo", "module": "tickets", "scope_type": "group", "description": "Asignar tickets dentro de su jerarquía"},
            {"key": "ticket:close:group", "name": "Cerrar en Grupo", "module": "tickets", "scope_type": "group", "description": "Finalizar tickets de su área"},
            
            # Partes Informativos
            {"key": "partes:read:global", "name": "Leer Partes Global", "module": "partes", "scope_type": "global", "description": "Ver todos los informes diarios"},
            {"key": "partes:read:group", "name": "Leer Partes Grupo", "module": "partes", "scope_type": "group", "description": "Ver informes de su área"},
            {"key": "partes:create", "name": "Cargar Partes", "module": "partes", "scope_type": "none", "description": "Generar nuevos informes de turno"},
            {"key": "partes:update:own", "name": "Editar Partes Propios", "module": "partes", "scope_type": "own", "description": "Modificar informes cargados por uno mismo"},
            
            # Panel Admin
            {"key": "admin:access", "name": "Acceso al Panel Admin", "module": "admin", "scope_type": "none", "description": "Permite entrar a la sección de administración"},
            {"key": "admin:users:read", "name": "Ver Usuarios", "module": "admin", "scope_type": "none", "description": "Listar cuentas de usuario"},
            {"key": "admin:users:manage", "name": "Gestionar Usuarios", "module": "admin", "scope_type": "none", "description": "Crear, editar y desactivar usuarios"},
            {"key": "admin:roles:read", "name": "Ver Roles", "module": "admin", "scope_type": "none", "description": "Ver matriz de roles y permisos"},
            {"key": "admin:roles:manage", "name": "Gestionar Roles", "module": "admin", "scope_type": "none", "description": "Modificar permisos y crear roles"},
            {"key": "admin:groups:read", "name": "Ver Grupos", "module": "admin", "scope_type": "none", "description": "Ver estructura organizacional"},
            {"key": "admin:groups:manage", "name": "Gestionar Grupos", "module": "admin", "scope_type": "none", "description": "Modificar jerarquía de grupos"},
            {"key": "admin:catalogs:read", "name": "Ver Catálogos", "module": "admin", "scope_type": "none", "description": "Ver tipos de tickets, estados, etc."},
            {"key": "admin:catalogs:manage", "name": "Gestionar Catálogos", "module": "admin", "scope_type": "none", "description": "Modificar workflows y tipos"},
            {"key": "admin:settings:read", "name": "Ver Configuración", "module": "admin", "scope_type": "none", "description": "Ver ajustes del sistema"},
            {"key": "admin:settings:manage", "name": "Gestionar Configuración", "module": "admin", "scope_type": "none", "description": "Modificar políticas y backups"},
            
            # Ubicaciones (Excepción DSIN)
            {"key": "admin:locations:read", "name": "Ver Ubicaciones", "module": "admin", "scope_type": "none", "description": "Ver lista de dependencias"},
            {"key": "admin:locations:manage", "name": "Gestionar Ubicaciones", "module": "admin", "scope_type": "none", "description": "Crear y editar dependencias"},
        ]

        permission_map = {}
        for p_data in permissions_data:
            result = await session.execute(select(Permission).filter(Permission.key == p_data["key"]))
            perm = result.scalar_one_or_none()
            if not perm:
                perm = Permission(**p_data)
                session.add(perm)
                await session.flush()
            else:
                # Update existing
                for k, v in p_data.items():
                    setattr(perm, k, v)
            permission_map[p_data["key"]] = perm

        # 2. Definir los Roles Finales según reglas de negocio
        roles_config = {
            "AdminPanelFull": [
                # Admin total
                "admin:access", "admin:users:manage", "admin:roles:manage", "admin:groups:manage", 
                "admin:catalogs:manage", "admin:settings:manage", "admin:locations:manage",
                "admin:users:read", "admin:roles:read", "admin:groups:read", "admin:catalogs:read", "admin:settings:read", "admin:locations:read",
                # Visibilidad global
                "ticket:read:global", "partes:read:global",
                "ticket:create", "partes:create"
            ],
            "DSIN_Operativo_AdminParcial": [
                # Operativo Global
                "ticket:read:global", "ticket:create", "ticket:update:assigned", "ticket:update:own",
                "ticket:assign:group", "ticket:close:group",
                "partes:read:global", "partes:create",
                # Admin Parcial
                "admin:access", "admin:locations:manage", "admin:locations:read",
                # Lectura de otros admin (opcional)
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

        for role_name, perms in roles_config.items():
            result = await session.execute(select(Role).filter(Role.name == role_name))
            role = result.scalar_one_or_none()
            if not role:
                role = Role(name=role_name, description=f"Perfil: {role_name}")
                session.add(role)
                await session.flush()
            
            # Limpiar permisos antiguos y asignar nuevos
            await session.execute(
                delete(RolePermission).where(RolePermission.role_id == role.id)
            )
            for p_key in perms:
                if p_key in permission_map:
                    rp = RolePermission(role_id=role.id, permission_id=permission_map[p_key].id)
                    session.add(rp)
        
        await session.commit()
        logger.info("✅ Matriz de Roles y Capacidades unificada correctamente.")

if __name__ == "__main__":
    asyncio.run(setup_iam_rules())
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

async def repair_iam_v3() -> None:
    async with AsyncSessionLocal() as session:
        # Definición con Módulos UNIFICADOS para secciones claras
        permissions_data = [
            # === GESTIÓN DE TICKETS ===
            {"key": "ticket:read:global", "name": "Visibilidad Global", "module": "GESTIÓN DE TICKETS", "scope_type": "global", "description": "Ver todos los tickets del sistema"},
            {"key": "ticket:read:group", "name": "Visibilidad de Grupo", "module": "GESTIÓN DE TICKETS", "scope_type": "group", "description": "Ver tickets de su área y sub-áreas"},
            {"key": "ticket:read:own", "name": "Visibilidad Propia", "module": "GESTIÓN DE TICKETS", "scope_type": "own", "description": "Ver solo lo creado o asignado a uno"},
            {"key": "ticket:create", "name": "Crear Incidentes", "module": "GESTIÓN DE TICKETS", "scope_type": "none", "description": "Abrir nuevos tickets de soporte"},
            {"key": "ticket:update:own", "name": "Editar Propios", "module": "GESTIÓN DE TICKETS", "scope_type": "own", "description": "Modificar sus propios tickets"},
            {"key": "ticket:update:assigned", "name": "Editar Asignados", "module": "GESTIÓN DE TICKETS", "scope_type": "own", "description": "Modificar tickets que tiene asignados"},
            {"key": "ticket:assign:group", "name": "Asignar en Área", "module": "GESTIÓN DE TICKETS", "scope_type": "group", "description": "Reasignar tickets dentro de su equipo"},
            {"key": "ticket:close:group", "name": "Cerrar Tickets", "module": "GESTIÓN DE TICKETS", "scope_type": "group", "description": "Finalizar incidentes de su área"},
            {"key": "ticket:update:bulk", "name": "Acciones Masivas", "module": "GESTIÓN DE TICKETS", "scope_type": "none", "description": "Editar múltiples tickets a la vez"},

            # === EVENTOS SIEM & SOC ===
            {"key": "siem:view", "name": "Ver Eventos SIEM", "module": "SEGURIDAD (SOC)", "scope_type": "global", "description": "Acceso al panel de alertas en tiempo real"},
            {"key": "siem:manage", "name": "Gestionar Alertas", "module": "SEGURIDAD (SOC)", "scope_type": "global", "description": "Remediar y procesar alertas del SIEM"},
            {"key": "forensics:eml", "name": "Analizador EML", "module": "SEGURIDAD (SOC)", "scope_type": "none", "description": "Uso de la herramienta de análisis de correos"},

            # === INVENTARIO DE ACTIVOS ===
            {"key": "asset:read:global", "name": "Ver Todo el Inventario", "module": "INVENTARIO (ASSETS)", "scope_type": "global", "description": "Ver todos los equipos y activos"},
            {"key": "asset:read:group", "name": "Ver Inventario de Grupo", "module": "INVENTARIO (ASSETS)", "scope_type": "group", "description": "Ver equipos de su área"},
            {"key": "asset:create", "name": "Cargar Activos", "module": "INVENTARIO (ASSETS)", "scope_type": "none", "description": "Registrar nuevos equipos"},
            {"key": "asset:update", "name": "Editar Activos", "module": "INVENTARIO (ASSETS)", "scope_type": "group", "description": "Modificar datos de equipos"},

            # === PARTES INFORMATIVOS ===
            {"key": "partes:read:global", "name": "Ver Todos los Partes", "module": "PARTES INFORMATIVOS", "scope_type": "global", "description": "Acceso a informes de todos los turnos"},
            {"key": "partes:read:group", "name": "Ver Partes de mi Grupo", "module": "PARTES INFORMATIVOS", "scope_type": "group", "description": "Ver informes de su equipo"},
            {"key": "partes:create", "name": "Generar Partes", "module": "PARTES INFORMATIVOS", "scope_type": "none", "description": "Crear reportes diarios/noche"},

            # === ADMINISTRACIÓN DEL SISTEMA ===
            {"key": "admin:access", "name": "Acceso al Panel Admin", "module": "ADMINISTRACIÓN", "scope_type": "none", "description": "Entrada a la sección de configuración"},
            {"key": "admin:users:manage", "name": "Gestión de Usuarios", "module": "ADMINISTRACIÓN", "scope_type": "none", "description": "Crear y editar cuentas"},
            {"key": "admin:roles:manage", "name": "Gestión de Roles", "module": "ADMINISTRACIÓN", "scope_type": "none", "description": "Configurar matriz de permisos"},
            {"key": "admin:groups:manage", "name": "Gestión de Grupos", "module": "ADMINISTRACIÓN", "scope_type": "none", "description": "Modificar jerarquía organizacional"},
            {"key": "admin:catalogs:manage", "name": "Gestión de Catálogos", "module": "ADMINISTRACIÓN", "scope_type": "none", "description": "Configurar tipos y flujos (Workflows)"},
            {"key": "admin:locations:manage", "name": "Gestión de Ubicaciones", "module": "ADMINISTRACIÓN", "scope_type": "none", "description": "Administrar árbol de dependencias"},
            {"key": "admin:settings:manage", "name": "Ajustes del Sistema", "module": "ADMINISTRACIÓN", "scope_type": "none", "description": "Políticas de seguridad y backups"},
        ]

        # Sincronizar
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

        # Re-vincular roles
        roles_config = {
            "AdminPanelFull": [p["key"] for p in permissions_data],
            "DSIN_Operativo_AdminParcial": [
                "ticket:read:global", "ticket:create", "ticket:update:assigned", "ticket:update:own",
                "ticket:assign:group", "ticket:close:group", "partes:read:global", "partes:create",
                "admin:access", "admin:locations:manage"
            ],
            "Area_Operativa": [
                "ticket:read:group", "ticket:create", "ticket:update:own", "ticket:update:assigned",
                "partes:read:group", "partes:create", "asset:read:group"
            ],
            "UsuarioFinal": [
                "ticket:read:own", "ticket:create"
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
        logger.info("✅ Matriz unificada por módulos funcionales.")

if __name__ == "__main__":
    asyncio.run(repair_iam_v3())

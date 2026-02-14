import asyncio
import uuid
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models.iam import Permission

PERMISSIONS = [
    # Assets
    ("assets:read:all", "Ver activos de su grupo y subordinados"),
    ("assets:read:global", "Ver TODOS los activos de la institución (Global)"),
    ("assets:manage:bulk", "Gestión masiva de activos"),
    ("assets:delete", "Eliminar activos"),
    ("assets:import", "Importar activos desde archivos"),
    ("assets:install", "Marcar activos como instalados"),
    ("assets:update", "Actualizar información de activos"),
    
    # SLA
    ("sla:read:all", "Ver todas las políticas de SLA"),
    ("sla:manage", "Gestionar políticas de SLA"),
    
    # IAM / Administration
    ("iam:manage:groups", "Gestionar grupos y jerarquías"),
    ("iam:manage:users", "Gestionar cuentas de usuario"),
    ("iam:manage:roles", "Gestionar roles y permisos"),
    
    # Forms
    ("forms:read:all", "Ver todas las plantillas de formularios"),
    ("forms:create", "Crear nuevas plantillas de formularios"),
    ("forms:submit", "Enviar respuestas de formularios"),
    ("forms:update", "Actualizar plantillas de formularios"),
    ("forms:delete", "Eliminar plantillas de formularios"),
    
    # Plugins
    ("plugins:read:all", "Ver plugins instalados"),
    ("plugins:manage", "Gestionar/Instalar plugins"),
    
    # System Settings
    ("admin:settings", "Gestionar configuración global del sistema"),
    ("admin:workflows", "Gestionar flujos de trabajo (workflows)"),
    
    # Tickets
    ("ticket:read:all", "Ver todos los tickets del sistema"),
    ("ticket:create", "Crear nuevos tickets"),
    ("ticket:update", "Actualizar información de tickets"),
    ("ticket:comment:create", "Añadir comentarios a tickets"),
    ("ticket:relation:create", "Relacionar tickets entre sí"),
    ("ticket:update:bulk", "Actualización masiva de tickets"),
    ("ticket:subtask:update", "Gestionar subtareas de tickets"),
    ("ticket:subtask:delete", "Eliminar subtareas de tickets"),
    ("ticket:watch", "Seguir tickets"),
    
    # Ticket Types
    ("ticket_types:read:all", "Ver tipos de tickets"),
    ("ticket_types:manage", "Gestionar categorías de tickets"),
    
    # Reports
    ("reports:export:tickets", "Exportar reportes de tickets"),
    
    # Endpoints
    ("endpoints:read:all", "Ver todos los equipos/endpoints"),
    ("endpoints:create", "Registrar nuevos equipos"),
    ("endpoints:update", "Actualizar información de equipos"),
    ("endpoints:delete", "Eliminar equipos"),
    
    # Locations
    ("locations:read:all", "Ver todas las dependencias"),
    ("locations:create", "Crear nuevas dependencias"),
    ("locations:update", "Actualizar dependencias"),
    ("locations:delete", "Eliminar dependencias"),
    
    # Dashboard
    ("dashboard:view:stats", "Ver estadísticas del dashboard"),
    ("dashboard:edit", "Personalizar layouts de dashboard"),
    
    # Audit
    ("audit:read:all", "Ver registros de auditoría global"),
]

async def seed_permissions():
    async with AsyncSessionLocal() as db:
        for name, desc in PERMISSIONS:
            result = await db.execute(select(Permission).where(Permission.name == name))
            existing = result.scalar_one_or_none()
            
            if not existing:
                print(f"Adding permission: {name}")
                new_perm = Permission(id=uuid.uuid4(), name=name, description=desc)
                db.add(new_perm)
            else:
                existing.description = desc
                
        await db.commit()
        print("Permissions synced successfully.")

if __name__ == "__main__":
    asyncio.run(seed_permissions())

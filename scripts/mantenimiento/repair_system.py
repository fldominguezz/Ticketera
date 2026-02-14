import asyncio
import logging
from sqlalchemy import text
from app.db.session import AsyncSessionLocal, engine
from app.db.base import Base
from app.db.models.user import User
from app.db.models.iam import Role, Permission, RolePermission, UserRole
from app.core.security import get_password_hash
from sqlalchemy.future import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("REPAIR_SYSTEM")

async def repair():
    async with engine.begin() as conn:
        logger.info("🛠 Creando tablas faltantes...")
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as db:
        logger.info("🔍 Verificando integridad de datos...")
        
        # 1. Asegurar Admin
        res = await db.execute(select(User).where(User.username == 'admin'))
        admin = res.scalar_one_or_none()
        if not admin:
            logger.info("➕ Creando usuario admin...")
            admin = User(
                username='admin',
                email='admin@example.com',
                hashed_password=get_password_hash('admin123'),
                is_active=True,
                is_superuser=True
            )
            db.add(admin)
            await db.flush()
        else:
            logger.info("✅ Usuario admin detectado")
            admin.hashed_password = get_password_hash('admin123')
            admin.is_active = True
            db.add(admin)

        # 2. Asegurar Rol Administrator
        res = await db.execute(select(Role).where(Role.name == 'Administrator'))
        admin_role = res.scalar_one_or_none()
        if not admin_role:
            admin_role = Role(name='Administrator', description='Full access')
            db.add(admin_role)
            await db.flush()

        # 3. Vincular Admin a Rol
        res = await db.execute(select(UserRole).where(UserRole.user_id == admin.id, UserRole.role_id == admin_role.id))
        if not res.scalar_one_or_none():
            db.add(UserRole(user_id=admin.id, role_id=admin_role.id))

        # 4. Vincular todos los permisos al rol (Si el script de seed ya corrió)
        res = await db.execute(select(Permission))
        all_perms = res.scalars().all()
        for p in all_perms:
            # Verificar si ya existe el vínculo
            res_p = await db.execute(select(RolePermission).where(RolePermission.role_id == admin_role.id, RolePermission.permission_id == p.id))
            if not res_p.scalar_one_or_none():
                db.add(RolePermission(role_id=admin_role.id, permission_id=p.id))

        await db.commit()
        logger.info("🏁 REPARACIÓN COMPLETA. Usa admin / admin123")

if __name__ == "__main__":
    asyncio.run(repair())

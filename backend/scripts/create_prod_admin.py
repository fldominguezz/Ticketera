import asyncio
import logging
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.db.models.group import Group
from app.core.security import get_password_hash
from app.core.config import settings
import uuid

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_prod_admin():
    async with AsyncSessionLocal() as db:
        # 1. Asegurar grupo raíz con formato correcto (List, no Dict)
        result = await db.execute(select(Group).where(Group.name == "Administración"))
        group = result.scalar_one_or_none()
        
        if not group:
            logger.info("Creating default Admin group...")
            group = Group(
                id=uuid.uuid4(),
                name="Administración",
                description="Grupo de administración total del sistema"
            )
            db.add(group)
        else:
            db.add(group)
        
        # 2. Asegurar usuario admin con email válido
        admin_email = settings.FIRST_SUPERUSER
        admin_password = settings.FIRST_SUPERUSER_PASSWORD
        admin_username = "admin" # Username base siempre es admin
        
        result = await db.execute(select(User).where(User.username == admin_username))
        user_obj = result.scalar_one_or_none()
        
        hashed_pw = get_password_hash(admin_password)
        
        if not user_obj:
            logger.info(f"Creating master admin account ({admin_email})...")
            admin = User(
                username=admin_username,
                email=admin_email,
                hashed_password=hashed_pw,
                first_name="Admin",
                last_name="Sistema",
                is_active=True,
                is_superuser=True,
                group_id=group.id,
                force_password_change=False
            )
            db.add(admin)
        else:
            logger.info("Admin account exists. Ensuring roles and state match...")
            # Actualizamos metadatos pero NO el password para permitir que el cambio manual persista
            user_obj.email = admin_email
            user_obj.is_superuser = True
            user_obj.group_id = group.id
            user_obj.is_active = True
            db.add(user_obj)
            
        await db.commit()
        logger.info(f"✅ Admin account ready: user='{admin_username}' / email='{admin_email}' / pass='******'")

if __name__ == "__main__":
    asyncio.run(create_prod_admin())
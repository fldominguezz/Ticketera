import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.db.models import User
from app.core.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def emergency_reset():
    async with AsyncSessionLocal() as session:
        # Buscar al usuario admin
        result = await session.execute(select(User).filter(User.username == "admin"))
        admin = result.scalar_one_or_none()
        
        if admin:
            logger.info(f"Reseteando usuario: {admin.username}")
            admin.hashed_password = get_password_hash("admin123")
            admin.failed_login_attempts = 0
            admin.locked_until = None
            admin.is_active = True
            
            session.add(admin)
            await session.commit()
            logger.info("✅ Contraseña reseteada a 'admin123' y cuenta desbloqueada.")
        else:
            logger.error("❌ No se encontró el usuario 'admin'.")

if __name__ == "__main__":
    asyncio.run(emergency_reset())

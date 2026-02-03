import asyncio
import logging
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings
from app.db.base import Base  # Asegurarse de que importa todos los modelos

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def force_db_init():
    logger.info("🚀 Iniciando creación forzada de tablas...")
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    
    async with engine.begin() as conn:
        # Esto creará todas las tablas definidas en los modelos importados en app.db.base
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("✅ Tablas creadas exitosamente.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(force_db_init())
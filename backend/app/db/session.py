from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from tenacity import retry, stop_after_attempt, wait_fixed
import logging
from typing import AsyncIterator
from sqlalchemy import text # Añadido
from app.core.config import settings
logger = logging.getLogger(__name__)
DATABASE_URL = settings.DATABASE_URL # Ya asumo que DATABASE_URL en .env será `postgresql+asyncpg`
engine = create_async_engine(DATABASE_URL, echo=False, future=True)
AsyncSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)
async def get_db() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session
@retry(stop=stop_after_attempt(5), wait=wait_fixed(2))
async def init_db():
    try:
        async with engine.connect() as conn: # Usar engine.connect() para probar la conexión
            # Ejecutar una consulta simple para verificar la conexión
            await conn.execute(text("SELECT 1")) # Modificado
        logger.info("Conexión a la base de datos establecida.")
    except Exception as e:
        logger.error(f"Error al conectar con la base de datos: {e}")
        raise

import asyncio
import logging
import sys
import os

# Añadir el path del backend para poder importar los módulos
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.db.models.group import Group
from app.crud.crud_user import user as crud_user

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def sync_all():
    logger.info("Sincronizando todos los usuarios con Docmost (Espacios y Grupos)...")
    async with AsyncSessionLocal() as db:
        # Cargamos usuarios con sus grupos para el mapeo
        result = await db.execute(select(User).options(selectinload(User.group)))
        users = result.scalars().all()
        
        for u in users:
            try:
                # La función sync_to_wiki ya maneja la creación/actualización y mapeo
                await crud_user.sync_to_wiki(u, action="update")
                logger.info(f"Sincronizado: {u.email} (Grupo: {u.group.name if u.group else 'Ninguno'})")
            except Exception as e:
                logger.error(f"Error sincronizando {u.email}: {e}")

if __name__ == "__main__":
    asyncio.run(sync_all())

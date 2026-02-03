import asyncio
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def sync_permissions():
    """
    Sincronización desactivada temporalmente para evitar conflictos con la nueva matriz dinámica.
    Los permisos ahora se gestionan desde el Panel Admin y el script repair_iam.py.
    """
    logger.info("Sync permissions bypassed (New dynamic matrix in use).")

if __name__ == "__main__":
    asyncio.run(sync_permissions())

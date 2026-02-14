import asyncio
import logging
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.db.session import AsyncSessionLocal
from app.db.models.user import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def sync_passwords():
    db_url_wiki = os.getenv("DATABASE_URL", "").replace("ticketera_db", "docmost_db")
    if not db_url_wiki:
        logger.error("DATABASE_URL not found")
        return

    logger.info("Sincronizando hashes de contraseñas con la Wiki...")
    engine_wiki = create_async_engine(db_url_wiki)
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("SELECT email, hashed_password FROM users"))
        users = result.all()
        
        async with engine_wiki.begin() as conn:
            for email, hashed_password in users:
                # Actualizar el password en Docmost con el hash de la Ticketera
                # Nota: Esto solo funciona si ambas apps usan algoritmos compatibles (como bcrypt)
                # Si Docmost usa otro, esto fallará, pero intentaremos la inserción directa del hash.
                try:
                    await conn.execute(
                        text("UPDATE users SET password = :hp WHERE email = :email"),
                        {"hp": hashed_password, "email": email}
                    )
                    logger.info(f"Password sincronizado para: {email}")
                except Exception as e:
                    logger.error(f"Error en {email}: {e}")
    
    await engine_wiki.dispose()

if __name__ == "__main__":
    asyncio.run(sync_passwords())

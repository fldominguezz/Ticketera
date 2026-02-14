import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def bulk_fix():
    print("Iniciando actualización de visibilidad global para tickets existentes...")
    async with AsyncSessionLocal() as db:
        try:
            # 1. Asegurar que la columna existe (en caso de que alembic no se use o falle)
            print("Verificando/Añadiendo columna is_global...")
            await db.execute(text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE;"))
            
            # 2. Marcar TODOS los tickets actuales como globales
            print("Marcando tickets actuales como globales...")
            result = await db.execute(text("UPDATE tickets SET is_global = TRUE;"))
            
            await db.commit()
            print(f"Éxito: Se actualizaron {result.rowcount} tickets.")
        except Exception as e:
            print(f"Error durante la actualización: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(bulk_fix())

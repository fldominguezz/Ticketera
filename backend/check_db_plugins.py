import asyncio
import sys
import os

# Añadir el path del app si es necesario
sys.path.append(os.path.join(os.getcwd(), "app"))

from app.db.session import AsyncSessionLocal
from app.db.models.plugin import Plugin
from sqlalchemy.future import select

async def run():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Plugin))
        plugins = result.scalars().all()
        print(f"FOUND_PLUGINS: {len(plugins)}")
        for p in plugins:
            print(f"PLUGIN: {p.name} - {p.version}")

if __name__ == "__main__":
    asyncio.run(run())

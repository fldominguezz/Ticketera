import uuid
import asyncio
import sys
sys.path.append("/app")

from app.db.session import AsyncSessionLocal
from app.db.models.wiki import WikiSpace, WikiPage
from app.db.models.user import User
from sqlalchemy import select, update, delete

async def reorganize():
    print("🧹 Iniciando reorganización masiva de la Wiki...")
    async with AsyncSessionLocal() as db:
        # 1. Obtener el admin
        res_admin = await db.execute(select(User).filter(User.username == "admin"))
        admin = res_admin.scalar_one_or_none()
        
        if not admin:
            print("❌ Error: No se encontró el usuario admin.")
            return

        # 2. Crear o buscar el Espacio Principal "ÁREA SOC"
        res_main = await db.execute(select(WikiSpace).filter(WikiSpace.name == "ÁREA SOC"))
        main_space = res_main.scalar_one_or_none()
        
        if not main_space:
            main_space = WikiSpace(
                id=uuid.uuid4(),
                name="ÁREA SOC",
                description="Repositorio central de procedimientos y documentación operativa del SOC",
                icon="shield",
                color="blue",
                creator_id=admin.id
            )
            db.add(main_space)
            await db.flush()
            print("✅ Librería 'ÁREA SOC' creada.")

        # 3. Obtener todas las demás librerías (excepto la principal)
        res_spaces = await db.execute(select(WikiSpace).filter(WikiSpace.id != main_space.id))
        other_spaces = res_spaces.scalars().all()

        for old_space in other_spaces:
            print(f"📦 Migrando contenido de: {old_space.name}")
            
            # Crear una carpeta de primer nivel en ÁREA SOC con el nombre de la vieja librería
            folder_container = WikiPage(
                id=uuid.uuid4(),
                space_id=main_space.id,
                parent_id=None,
                title=old_space.name.upper(),
                is_folder=True,
                creator_id=admin.id
            )
            db.add(folder_container)
            await db.flush()

            # Mover todas las páginas que eran raíz en la vieja librería a esta nueva carpeta
            await db.execute(
                update(WikiPage)
                .where(WikiPage.space_id == old_space.id, WikiPage.parent_id == None)
                .values(space_id=main_space.id, parent_id=folder_container.id)
            )
            
            # Mover las que ya tenían padre (recursivo por space_id)
            await db.execute(
                update(WikiPage)
                .where(WikiPage.space_id == old_space.id)
                .values(space_id=main_space.id)
            )

        await db.commit()
        
        # 4. Eliminar las librerías viejas ahora que están vacías
        print("🗑️ Limpiando librerías redundantes...")
        await db.execute(delete(WikiSpace).filter(WikiSpace.id != main_space.id))
        await db.commit()
        
        print("✨ Reorganización completada. Todas las carpetas están dentro de 'ÁREA SOC'.")

if __name__ == "__main__":
    asyncio.run(reorganize())

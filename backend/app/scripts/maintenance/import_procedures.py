import os
import sys
import uuid
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Añadir el path para importar modelos
sys.path.append("/app")

from app.db.session import AsyncSessionLocal
from app.db.models.wiki import WikiSpace, WikiPage
from app.db.models.user import User

BASE_DIR = "/app/procedimientos_temp"

async def get_admin_user(db: AsyncSession):
    result = await db.execute(select(User).filter(User.username == "admin"))
    return result.scalar_one_or_none()

async def import_procedures():
    print("🚀 Iniciando importación masiva de procedimientos...")
    async with AsyncSessionLocal() as db:
        admin = await get_admin_user(db)
        if not admin:
            print("❌ Error: No se encontró el usuario admin.")
            return

        # Recorrer carpetas de primer nivel (Espacios)
        for space_name in os.listdir(BASE_DIR):
            space_path = os.path.join(BASE_DIR, space_name)
            if not os.path.isdir(space_path):
                continue

            print(f"📁 Procesando Espacio: {space_name}")
            
            # Crear o buscar el espacio
            res_space = await db.execute(select(WikiSpace).filter(WikiSpace.name == space_name))
            space = res_space.scalar_one_or_none()
            
            if not space:
                space = WikiSpace(
                    id=uuid.uuid4(),
                    name=space_name,
                    description=f"Procedimientos importados de {space_name}",
                    is_private=False,
                    creator_id=admin.id
                )
                db.add(space)
                await db.flush()

            # Función recursiva para importar carpetas y archivos
            async def process_folder(current_path, parent_id=None):
                try:
                    for item in os.listdir(current_path):
                        if item.startswith('~$') or item == 'Thumbs.db': 
                            continue
                            
                        item_path = os.path.join(current_path, item)
                        
                        if os.path.isdir(item_path):
                            # Crear carpeta en la Wiki
                            folder_page = WikiPage(
                                id=uuid.uuid4(),
                                space_id=space.id,
                                parent_id=parent_id,
                                title=item,
                                is_folder=True,
                                creator_id=admin.id
                            )
                            db.add(folder_page)
                            await db.flush()
                            await process_folder(item_path, folder_page.id)
                        else:
                            # Es un archivo (Página)
                            if item.lower().endswith(('.pdf', '.docx', '.doc')):
                                # Crear página de documento
                                page = WikiPage(
                                    id=uuid.uuid4(),
                                    space_id=space.id,
                                    parent_id=parent_id,
                                    title=item.rsplit('.', 1)[0],
                                    content=f"<p>Documento importado automáticamente: {item}</p>",
                                    original_file_path=item_path.replace("/app/procedimientos_temp", "/home/fdominguez/Procedimientos"), 
                                    is_folder=False,
                                    creator_id=admin.id
                                )
                                db.add(page)
                                await db.flush()
                                print(f"  📄 Página creada: {item}")
                except Exception as e:
                    print(f"  ⚠️ Error procesando {current_path}: {e}")

            await process_folder(space_path)
            await db.commit()
            print(f"✅ Espacio {space_name} completado.")

if __name__ == "__main__":
    asyncio.run(import_procedures())

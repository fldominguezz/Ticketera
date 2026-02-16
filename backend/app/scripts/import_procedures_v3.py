import os
import asyncio
import uuid
import shutil
from sqlalchemy import text
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.db.models.wiki import WikiSpace, WikiPage
from app.db.models.user import User
from slugify import slugify

# Configuración
PROCEDURES_PATH = "/app/procedimientos_temp"
SPACE_NAME = "PROCEDIMIENTOS OPERATIVOS"
FILES_DIR = "/app/uploads/wiki_files"
FILES_URL_PREFIX = "/uploads/wiki_files"

async def get_admin_user(session: AsyncSession):
    res = await session.execute(select(User).filter(User.email == "admin@example.com"))
    return res.scalar_one()

async def import_folder(session: AsyncSession, path: str, space_id: uuid.UUID, admin_id: uuid.UUID, parent_id: uuid.UUID = None):
    items = sorted(os.listdir(path))
    
    for item in items:
        if item.startswith("~$") or item.startswith("."): continue
        full_path = os.path.join(path, item)
        
        if os.path.isdir(full_path):
            page_title = item
            print(f"📁 Carpeta: {page_title}")
            db_page = WikiPage(
                id=uuid.uuid4(), space_id=space_id, parent_id=parent_id,
                title=page_title, slug=slugify(f"{page_title}-{uuid.uuid4().hex[:4]}"),
                content=f"<p>Contenido de {page_title}</p>", is_folder=True, creator_id=admin_id
            )
            session.add(db_page)
            await session.flush()
            await import_folder(session, full_path, space_id, admin_id, db_page.id)
            
        elif item.lower().endswith('.docx'):
            page_title = os.path.splitext(item)[0]
            print(f"📄 Preservando Word: {page_title}")
            
            # Guardar copia del binario
            file_id = uuid.uuid4().hex
            filename = f"{file_id}.docx"
            dest_path = os.path.join(FILES_DIR, filename)
            shutil.copy2(full_path, dest_path)
            
            db_page = WikiPage(
                id=uuid.uuid4(), space_id=space_id, parent_id=parent_id,
                title=page_title, slug=slugify(f"{page_title}-{uuid.uuid4().hex[:4]}"),
                content="", # El contenido real se cargará vía docx-preview
                is_folder=False,
                original_file_path=f"{FILES_URL_PREFIX}/{filename}",
                creator_id=admin_id
            )
            session.add(db_page)
            await session.flush()

async def main():
    async with AsyncSessionLocal() as session:
        admin = await get_admin_user(session)
        res_s = await session.execute(select(WikiSpace).filter(WikiSpace.name == SPACE_NAME))
        space = res_s.scalar_one_or_none()
        
        if space:
            await session.execute(text("DELETE FROM wiki_pages WHERE space_id = :sid"), {"sid": space.id})
            print("Limpieza de espacio anterior completada.")
        else:
            space = WikiSpace(id=uuid.uuid4(), name=SPACE_NAME, description="Wiki de Alta Fidelidad (Clon Word)", icon="book", color="blue", creator_id=admin.id)
            session.add(space)
            await session.flush()
        
        await import_folder(session, PROCEDURES_PATH, space.id, admin.id)
        await session.commit()
        print("✅ Importación de Alta Fidelidad finalizada.")

if __name__ == "__main__":
    asyncio.run(main())

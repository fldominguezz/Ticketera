import os
import asyncio
import uuid
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.db.models.wiki import WikiSpace, WikiPage
from app.db.models.user import User
from slugify import slugify
import fitz  # PyMuPDF
from docx import Document
import io

# Configuración
PROCEDURES_PATH = "/app/procedimientos_temp"
SPACE_NAME = "PROCEDIMIENTOS OPERATIVOS"

async def get_admin_user(session: AsyncSession):
    res = await session.execute(select(User).filter(User.email == "admin@example.com"))
    return res.scalar_one()

def extract_text_from_pdf(path):
    try:
        doc = fitz.open(path)
        text = ""
        for page in doc:
            text += page.get_text("html") # Intentamos mantener formato
        return text
    except Exception as e:
        return f"<p>Error al extraer PDF: {str(e)}</p>"

def extract_text_from_docx(path):
    try:
        doc = Document(path)
        html = ""
        for para in doc.paragraphs:
            if para.text.strip():
                html += f"<p>{para.text}</p>"
        return html
    except Exception as e:
        return f"<p>Error al extraer DOCX: {str(e)}</p>"

async def import_folder(session: AsyncSession, path: str, space_id: uuid.UUID, admin_id: uuid.UUID, parent_id: uuid.UUID = None):
    items = sorted(os.listdir(path))
    
    for item in items:
        if item.startswith("~$") or item.startswith("."): continue
        
        full_path = os.path.join(path, item)
        
        if os.path.isdir(full_path):
            # Crear una página tipo "Carpeta"
            page_title = item
            print(f"Creando carpeta: {page_title}")
            
            db_page = WikiPage(
                id=uuid.uuid4(),
                space_id=space_id,
                parent_id=parent_id,
                title=page_title,
                slug=slugify(f"{page_title}-{uuid.uuid4().hex[:4]}"),
                content=f"<h5>Contenido de {page_title}</h5>",
                creator_id=admin_id
            )
            session.add(db_page)
            await session.flush()
            
            # Recurrencia
            await import_folder(session, full_path, space_id, admin_id, db_page.id)
            
        elif item.lower().endswith(('.pdf', '.docx')):
            page_title = os.path.splitext(item)[0]
            print(f"Importando documento: {page_title}")
            
            content = ""
            if item.lower().endswith('.pdf'):
                content = extract_text_from_pdf(full_path)
            else:
                content = extract_text_from_docx(full_path)
                
            db_page = WikiPage(
                id=uuid.uuid4(),
                space_id=space_id,
                parent_id=parent_id,
                title=page_title,
                slug=slugify(f"{page_title}-{uuid.uuid4().hex[:4]}"),
                content=content,
                creator_id=admin_id
            )
            session.add(db_page)
            await session.flush()

async def main():
    async with AsyncSessionLocal() as session:
        admin = await get_admin_user(session)
        
        # 1. Crear o buscar Espacio
        res_s = await session.execute(select(WikiSpace).filter(WikiSpace.name == SPACE_NAME))
        space = res_s.scalar_one_or_none()
        
        if not space:
            space = WikiSpace(
                id=uuid.uuid4(),
                name=SPACE_NAME,
                description="Importación automática de procedimientos desde el servidor",
                icon="shield",
                color="orange",
                creator_id=admin.id
            )
            session.add(space)
            await session.flush()
            print(f"Espacio '{SPACE_NAME}' creado.")
        
        # 2. Iniciar importación recursiva
        await import_folder(session, PROCEDURES_PATH, space.id, admin.id)
        
        await session.commit()
        print("Importación finalizada con éxito.")

if __name__ == "__main__":
    asyncio.run(main())

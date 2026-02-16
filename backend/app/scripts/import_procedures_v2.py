import os
import asyncio
import uuid
import re
import base64
from sqlalchemy import text
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.db.models.wiki import WikiSpace, WikiPage
from app.db.models.user import User
from slugify import slugify
import fitz  # PyMuPDF
import mammoth
from datetime import datetime

# Configuración
PROCEDURES_PATH = "/app/procedimientos_temp"
SPACE_NAME = "PROCEDIMIENTOS OPERATIVOS"
MEDIA_DIR = "/app/uploads/wiki_media"
MEDIA_URL_PREFIX = "/uploads/wiki_media"

async def get_admin_user(session: AsyncSession):
    res = await session.execute(select(User).filter(User.email == "admin@example.com"))
    return res.scalar_one()

def handle_image(image):
    """Maneja las imágenes extraídas por mammoth"""
    with image.open() as image_bytes:
        encoded_src = base64.b64encode(image_bytes.read()).decode("ascii")
        # Para evitar saturar el HTML con base64, guardamos en disco
        img_id = uuid.uuid4().hex
        ext = image.content_type.split("/")[-1]
        filename = f"{img_id}.{ext}"
        
        with open(os.path.join(MEDIA_DIR, filename), "wb") as f:
            image_bytes.seek(0)
            f.write(image_bytes.read())
            
        return {
            "src": f"{MEDIA_URL_PREFIX}/{filename}"
        }

def extract_content_from_docx(path):
    try:
        with open(path, "rb") as docx_file:
            result = mammoth.convert_to_html(docx_file, convert_image=mammoth.images.img_element(handle_image))
            return result.value
    except Exception as e:
        return f"<p>Error al extraer DOCX: {str(e)}</p>"

def extract_content_from_pdf(path):
    """Extrae HTML de PDF e intenta rescatar imágenes"""
    try:
        doc = fitz.open(path)
        html = ""
        for page_num in range(len(doc)):
            page = doc[page_num]
            # Extraer texto con formato HTML
            page_html = page.get_text("html")
            
            # Procesar imágenes de la página
            image_list = page.get_images(full=True)
            for img_index, img in enumerate(image_list):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                ext = base_image["ext"]
                
                img_filename = f"pdf_{uuid.uuid4().hex}.{ext}"
                with open(os.path.join(MEDIA_DIR, img_filename), "wb") as f:
                    f.write(image_bytes)
                
                # Insertar referencia de imagen al final de la página del PDF
                page_html += f'<div style="text-align:center"><img src="{MEDIA_URL_PREFIX}/{img_filename}" style="max-width:100%"/></div>'
            
            html += page_html
        return html
    except Exception as e:
        return f"<p>Error al extraer PDF: {str(e)}</p>"

async def import_folder(session: AsyncSession, path: str, space_id: uuid.UUID, admin_id: uuid.UUID, parent_id: uuid.UUID = None):
    items = sorted(os.listdir(path))
    
    for item in items:
        if item.startswith("~$") or item.startswith("."): continue
        full_path = os.path.join(path, item)
        
        if os.path.isdir(full_path):
            page_title = item
            print(f"📁 Creando carpeta: {page_title}")
            db_page = WikiPage(
                id=uuid.uuid4(), space_id=space_id, parent_id=parent_id,
                title=page_title, slug=slugify(f"{page_title}-{uuid.uuid4().hex[:4]}"),
                content=f"<p>Contenido de la carpeta {page_title}</p>", 
                is_folder=True,
                creator_id=admin_id
            )
            session.add(db_page)
            await session.flush()
            await import_folder(session, full_path, space_id, admin_id, db_page.id)
            
        elif item.lower().endswith(('.pdf', '.docx')):
            page_title = os.path.splitext(item)[0]
            print(f"📄 Importando documento: {page_title}")
            content = extract_content_from_pdf(full_path) if item.lower().endswith('.pdf') else extract_content_from_docx(full_path)
            
            # Envolver en un div con fuentes estándar para mejor legibilidad
            styled_content = f'<div class="wiki-imported-content" style="font-family: Arial, sans-serif; line-height: 1.6;">{content}</div>'
            
            db_page = WikiPage(
                id=uuid.uuid4(), space_id=space_id, parent_id=parent_id,
                title=page_title, slug=slugify(f"{page_title}-{uuid.uuid4().hex[:4]}"),
                content=styled_content, creator_id=admin_id
            )
            session.add(db_page)
            await session.flush()

async def main():
    async with AsyncSessionLocal() as session:
        admin = await get_admin_user(session)
        
        # Limpiar espacio anterior para evitar duplicados en la prueba
        res_s = await session.execute(select(WikiSpace).filter(WikiSpace.name == SPACE_NAME))
        space = res_s.scalar_one_or_none()
        if space:
            # Borrar páginas anteriores
            await session.execute(text("DELETE FROM wiki_pages WHERE space_id = :sid"), {"sid": space.id})
            print("Limpieza de espacio anterior completada.")
        else:
            space = WikiSpace(id=uuid.uuid4(), name=SPACE_NAME, description="Procedimientos corporativos con imágenes y formato", icon="shield", color="orange", creator_id=admin.id)
            session.add(space)
            await session.flush()
        
        await import_folder(session, PROCEDURES_PATH, space.id, admin.id)
        await session.commit()
        print("✅ Importación finalizada con éxito.")

if __name__ == "__main__":
    asyncio.run(main())

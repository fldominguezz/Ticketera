from typing import List, Any, Annotated, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from slugify import slugify

from app.api.deps import get_db, get_current_active_user
from app.db.models.user import User
from app.db.models.wiki import WikiSpace, WikiPage, WikiPageHistory
from app.db.models.group import Group
from app.schemas.wiki import (
    WikiSpace as WikiSpaceSchema, WikiSpaceCreate, WikiSpaceUpdate, WikiSpaceWithPages,
    WikiPage as WikiPageSchema, WikiPageCreate, WikiPageUpdate,
    WikiHistory as WikiHistorySchema
)

router = APIRouter()

# --- HELPER ---
async def get_descendant_group_ids(db: AsyncSession, group_id: UUID) -> List[UUID]:
    """
    Obtiene recursivamente todos los IDs de los grupos hijos.
    """
    descendants = [group_id]
    result = await db.execute(select(Group.id).where(Group.parent_id == group_id))
    child_ids = result.scalars().all()
    for cid in child_ids:
        descendants.extend(await get_descendant_group_ids(db, cid))
    return descendants

# --- SPACES ---

@router.get("/spaces", response_model=List[WikiSpaceSchema])
async def read_spaces(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    """
    Lista todos los espacios visibles para el usuario.
    Regla: Públicos O (mi grupo O grupos hijos si soy padre).
    """
    query = select(WikiSpace)
    if not current_user.is_superuser:
        # Condiciones básicas: Públicos
        conditions = [WikiSpace.is_private == False]
        
        if current_user.group_id:
            # Obtener todos mis grupos (el mío y mis descendientes)
            allowed_group_ids = await get_descendant_group_ids(db, current_user.group_id)
            conditions.append(WikiSpace.owner_group_id.in_(allowed_group_ids))
            
        query = query.filter(or_(*conditions))
    
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/spaces", response_model=WikiSpaceSchema)
async def create_space(
    space_in: WikiSpaceCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    if space_in.is_private and not space_in.owner_group_id:
        space_in.owner_group_id = current_user.group_id
        
    db_obj = WikiSpace(**space_in.model_dump(), creator_id=current_user.id)
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.put("/spaces/{space_id}", response_model=WikiSpaceSchema)
async def update_space(
    space_id: UUID,
    space_in: WikiSpaceUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    space = await db.get(WikiSpace, space_id)
    if not space: raise HTTPException(404, "Space not found")
    
    # Solo el creador o un superusuario puede editar el espacio
    if not current_user.is_superuser and space.creator_id != current_user.id:
        raise HTTPException(403, "No tienes permiso para editar esta librería")

    update_data = space_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(space, field, value)
    
    db.add(space)
    await db.commit()
    await db.refresh(space)
    return space

@router.delete("/spaces/{space_id}")
async def delete_space(
    space_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    space = await db.get(WikiSpace, space_id)
    if not space: raise HTTPException(404, "Space not found")
    
    if not current_user.is_superuser and space.creator_id != current_user.id:
        raise HTTPException(403, "No tienes permiso para eliminar esta librería")

    await db.delete(space)
    await db.commit()
    return {"status": "ok"}

@router.get("/spaces/{space_id}/tree")
async def get_space_tree(
    space_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    """
    Devuelve la lista plana de páginas del espacio. El frontend armará el árbol.
    """
    space = await db.get(WikiSpace, space_id)
    if not space: raise HTTPException(404, "Space not found")
    
    # Obtenemos campos necesarios para el árbol
    result = await db.execute(
        select(WikiPage.id, WikiPage.title, WikiPage.parent_id, WikiPage.space_id, WikiPage.is_folder, WikiPage.original_file_path)
        .where(WikiPage.space_id == space_id)
    )
    pages = result.all()
    
    # Formateamos como lista de dicts
    return [{
        "id": p.id, 
        "title": p.title, 
        "parent_id": p.parent_id, 
        "space_id": p.space_id, 
        "is_folder": p.is_folder,
        "original_file_path": p.original_file_path
    } for p in pages]

import uuid
import os
import shutil
import logging
import requests
from fastapi import File, UploadFile
from fastapi.responses import FileResponse

logger = logging.getLogger(__name__)

@router.post("/pages/upload")
async def upload_wiki_file(
    space_id: UUID = Body(...),
    parent_id: Optional[UUID] = Body(None),
    file: UploadFile = File(...),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
    current_user: Annotated[User, Depends(get_current_active_user)] = None
):
    """
    Importa un procedimiento (.docx o .pdf) y crea la página correspondiente.
    """
    # 1. Crear directorio si no existe
    upload_dir = "/app/uploads/wiki_files"
    os.makedirs(upload_dir, exist_ok=True)

    # 2. Generar nombre de archivo único
    file_ext = os.path.splitext(file.filename)[1]
    safe_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(upload_dir, safe_filename)

    # 3. Guardar archivo en disco
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 4. Crear registro en DB
    title = file.filename.replace(".docx", "").replace(".pdf", "").replace("_", " ").title()
    
    # Generar Slug
    base_slug = slugify(title)
    slug = f"{base_slug}-{uuid.uuid4().hex[:4]}"

    db_obj = WikiPage(
        title=title,
        slug=slug,
        space_id=space_id,
        parent_id=parent_id,
        creator_id=current_user.id,
        last_updated_by_id=current_user.id,
        original_file_path=f"/uploads/wiki_files/{safe_filename}",
        is_folder=False,
        content=f"<p>Documento importado: {file.filename}</p>"
    )
    
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)

    return {"id": str(db_obj.id), "title": db_obj.title}

# --- ONLYOFFICE INTEGRATION ---

import jwt

@router.get("/pages/{page_id}/office-config")
async def get_office_config(
    page_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    mode: str = "view" # 'view' or 'edit'
):
    """
    Genera la configuración FIRMADA para OnlyOffice según el modo solicitado.
    MODO: Document Workspace Institucional.
    """
    page = await db.get(WikiPage, page_id)
    if not page or not page.original_file_path:
        raise HTTPException(404, "Documento no encontrado")

    file_ext = os.path.splitext(page.original_file_path)[1].replace(".", "")
    domain = os.getenv("DOMAIN_NAME", "10.1.9.240")
    secret = os.getenv("ONLYOFFICE_JWT_SECRET", "ssi_pfa_2026_ticketera_key_fixed")

    is_edit = (mode == "edit")
    
    import urllib.parse
    encoded_path = urllib.parse.quote(page.original_file_path)
    
    # IMPORTANTE: doc_key debe ser único para forzar refresco de permisos
    import time
    doc_key = f"{page.id}-{int(time.time())}"

    config = {
        "document": {
            "fileType": file_ext,
            "key": doc_key,
            "title": f"{page.title}.{file_ext}",
            "url": f"http://backend:8000{encoded_path}",
            "permissions": {
                "edit": True if mode == "edit" else False,
                "download": True,
                "print": True,
                "fillForms": True,
                "comment": is_edit,
                "review": is_edit,
                "copy": True,
                "modifyFilter": True,
                "modifyContentControl": True
            }
        },
        "editorConfig": {
            "callbackUrl": f"http://backend:8000/api/v1/wiki/pages/{page.id}/callback",
            "user": {
                "id": str(current_user.id),
                "name": f"{current_user.first_name} {current_user.last_name}" if current_user.first_name else current_user.username
            },
            "lang": "es",
            "mode": mode,
            "customization": {
                "forcesave": True,
                "autosave": True,
                "zoom": 100, 
                "compactHeader": True,
                "compactToolbar": not is_edit,
                "help": False,
                "feedback": False,
                "goback": False,
                "chat": False,
                "toolbarNoTabs": not is_edit,
                "hideRightMenu": not is_edit,
                "hideRulers": not is_edit,
                "unit": "cm",
                "customer": {
                    "address": "División Seguridad Informática",
                    "info": "SSI Corporativo - Repositorio de Procedimientos",
                    "logo": "https://10.1.9.240/favicon.svg",
                    "mail": "ssi@pfa.gob.ar",
                    "name": "SSI Corporativo",
                    "www": "https://10.1.9.240"
                }
            }
        },
        "type": "desktop",
        "height": "100%",
        "width": "100%"
    }

    token = jwt.encode(config, secret, algorithm="HS256")
    config["token"] = token
    return config

@router.post("/pages/{page_id}/callback")
async def office_callback(
    page_id: UUID,
    data: dict = Body(...),
    db: Annotated[AsyncSession, Depends(get_db)] = None
):
    """
    Endpoint de guardado de OnlyOffice.
    Status 2: El documento está listo para ser guardado.
    """
    status = data.get("status")
    
    # 2 = Document Ready for Saving
    if status == 2:
        download_url = data.get("url")
        page = await db.get(WikiPage, page_id)
        if not page: return {"error": 1}

        # Descargar el archivo desde OnlyOffice y sobreescribir el original
        try:
            response = requests.get(download_url, verify=True, timeout=30)
        except requests.exceptions.SSLError:
            # Si falla por SSL, intentamos con verify=False pero logueamos la advertencia
            logger.warning(f"Wiki: Error de SSL al conectar con OnlyOffice ({download_url}). Reintentando sin verificación (No seguro).")
            response = requests.get(download_url, verify=False, timeout=30) # nosec
        
        if response.status_code == 200:
            full_path = f"/app{page.original_file_path}"
            with open(full_path, "wb") as f:
                f.write(response.content)
            
            # Borrar el PDF viejo para que se regenere en la próxima lectura (preview)
            pdf_path = full_path.replace(".docx", ".pdf")
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
                
            page.updated_at = func.now()
            await db.commit()
            logger.info(f"Wiki: Archivo {page.title} actualizado desde OnlyOffice")
        else:
            logger.error(f"Wiki: Error descargando archivo de OnlyOffice: {response.status_code}")
            return {"error": 1}

    return {"error": 0}

# --- PAGES ---

@router.post("/pages", response_model=Any)
async def create_page(
    page_in: WikiPageCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    # Generar Slug único
    base_slug = slugify(page_in.title)
    slug = base_slug
    counter = 1
    while True:
        res = await db.execute(select(WikiPage).where(WikiPage.slug == slug))
        if not res.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    db_obj = WikiPage(
        **page_in.model_dump(),
        slug=slug,
        creator_id=current_user.id,
        last_updated_by_id=current_user.id
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    
    return {
        "id": str(db_obj.id),
        "title": db_obj.title,
        "is_folder": db_obj.is_folder,
        "space_id": str(db_obj.space_id)
    }

import subprocess
import os
import requests
import time
from fastapi.responses import FileResponse

@router.get("/pages/{page_id}/pdf")
async def get_page_pdf(
    page_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    """
    Sirve el PDF directamente o convierte DOCX a PDF si es necesario.
    """
    page_query = await db.execute(select(WikiPage).where(WikiPage.id == page_id))
    page = page_query.scalar_one_or_none()
    
    if not page or not page.original_file_path:
        raise HTTPException(404, "Documento no encontrado o no tiene archivo asociado")

    # Ruta absoluta dentro del contenedor
    orig_path = f"/app{page.original_file_path}"
    
    if not os.path.exists(orig_path):
        logger.error(f"Wiki PDF: No existe el archivo en disco: {orig_path}")
        raise HTTPException(404, f"Archivo original no encontrado en disco: {page.title}")

    # Si ya es un PDF, lo servimos directamente
    if orig_path.lower().endswith('.pdf'):
        return FileResponse(orig_path, media_type='application/pdf', filename=f"{page.title}.pdf")

    # Si es un DOCX, intentamos servir el PDF pre-generado o convertirlo
    pdf_path = orig_path.replace(".docx", ".pdf").replace(".doc", ".pdf")

    if not os.path.exists(pdf_path):
        try:
            output_dir = os.path.dirname(pdf_path)
            logger.info(f"Wiki PDF: Convirtiendo DOCX a PDF: {orig_path}")
            cmd = ['libreoffice', '--headless', '--convert-to', 'pdf', '--outdir', output_dir, orig_path]
            subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=60)
        except Exception as e:
            logger.error(f"Wiki PDF: Error convirtiendo: {str(e)}")
            raise HTTPException(500, "Error al generar vista previa del documento Word")

    return FileResponse(pdf_path, media_type='application/pdf', filename=f"{page.title}.pdf")

@router.post("/pages/{page_id}/convert-to-editable")
async def convert_to_editable(
    page_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    """
    Crea una COPIA editable (.docx) de un PDF existente con alta fidelidad.
    """
    page = await db.get(WikiPage, page_id)
    if not page or not page.original_file_path:
        raise HTTPException(404, "Página o archivo no encontrado")

    pdf_path = f"/app{page.original_file_path}"
    if not os.path.exists(pdf_path):
        raise HTTPException(404, f"El archivo PDF físico no existe en disco: {page.original_file_path}")

    # Generar nueva ruta para el DOCX en wiki_media (compartido)
    upload_dir = "/app/uploads/wiki_media/Convertidos"
    os.makedirs(upload_dir, exist_ok=True)
    
    new_filename = f"{uuid.uuid4().hex}.docx"
    docx_rel_path = f"/uploads/wiki_media/Convertidos/{new_filename}"
    docx_abs_path = f"/app{docx_rel_path}"

    try:
        from pdf2docx import Converter
        logger.info(f"Wiki: Iniciando conversión fiel de PDF a Word. Origen: {pdf_path}")
        
        cv = Converter(pdf_path)
        # Convertir con parámetros de alta fidelidad
        cv.convert(docx_abs_path, start=0, end=None)
        cv.close()

        if not os.path.exists(docx_abs_path):
            raise Exception("El archivo Word no fue generado por el motor de conversión.")

        # Crear nueva página en la DB como COPIA separada
        new_page = WikiPage(
            id=uuid.uuid4(),
            title=f"[EDITABLE] {page.title}",
            slug=slugify(f"edit-{uuid.uuid4().hex[:4]}-{page.title}"),
            space_id=page.space_id,
            parent_id=page.parent_id, # La ponemos en la misma carpeta
            creator_id=current_user.id,
            last_updated_by_id=current_user.id,
            original_file_path=docx_rel_path,
            is_folder=False,
            content=f"<p>Copia editable generada desde el PDF original: <b>{page.title}</b></p>"
        )
        
        db.add(new_page)
        await db.commit()
        await db.refresh(new_page)

        return {
            "status": "success", 
            "message": "Copia editable creada con éxito", 
            "new_page_id": str(new_page.id)
        }
    except Exception as e:
        logger.error(f"Error crítico en conversión PDF->DOCX: {str(e)}")
        raise HTTPException(500, f"Error en el motor de conversión: {str(e)}")

@router.get("/pages/{page_id}")
async def read_page(
    page_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    result = await db.execute(
        select(WikiPage)
        .where(WikiPage.id == page_id)
    )
    page = result.scalar_one_or_none()
    if not page: raise HTTPException(404, "Page not found")
    
    # Incrementar vistas de forma segura
    page.view_count += 1
    await db.commit()
    await db.refresh(page)

    # Devolvemos un dict plano para evitar errores de serialización/Greenlet
    return {
        "id": str(page.id),
        "space_id": str(page.space_id),
        "parent_id": str(page.parent_id) if page.parent_id else None,
        "title": page.title,
        "slug": page.slug,
        "content": page.content,
        "is_published": page.is_published,
        "is_folder": page.is_folder,
        "original_file_path": page.original_file_path,
        "view_count": page.view_count,
        "creator_id": str(page.creator_id),
        "last_updated_by_id": str(page.last_updated_by_id) if page.last_updated_by_id else None,
        "created_at": page.created_at.isoformat() if page.created_at else None,
        "updated_at": page.updated_at.isoformat() if page.updated_at else None
    }

@router.put("/pages/{page_id}", response_model=Any)
async def update_page(
    page_id: UUID,
    page_in: WikiPageUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    result = await db.execute(select(WikiPage).where(WikiPage.id == page_id))
    page = result.scalar_one_or_none()
    if not page: raise HTTPException(404, "Page not found")

    # 1. Guardar Historial si cambia el contenido
    if page_in.content is not None and page_in.content != page.content:
        history = WikiPageHistory(
            page_id=page.id,
            editor_id=current_user.id,
            content_snapshot=page.content or "",
            change_summary=page_in.change_summary
        )
        db.add(history)

    # 2. Actualizar campos
    update_data = page_in.model_dump(exclude={"change_summary"}, exclude_unset=True)
    for field, value in update_data.items():
        setattr(page, field, value)
    
    # 3. Regenerar slug si cambia el título
    if page_in.title and page_in.title != page.title:
        page.slug = slugify(f"{page_in.title}-{uuid.uuid4().hex[:4]}")

    page.last_updated_by_id = current_user.id
    db.add(page)
    await db.commit()
    await db.refresh(page)
    
    return {
        "id": str(page.id),
        "title": page.title,
        "parent_id": str(page.parent_id) if page.parent_id else None
    }

@router.delete("/pages/{page_id}")
async def delete_page(
    page_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    """
    Elimina una página y todas sus subpáginas recursivamente.
    """
    page = await db.get(WikiPage, page_id)
    if not page: raise HTTPException(404, "Page not found")
    
    await db.delete(page)
    await db.commit()
    return {"status": "ok"}

@router.get("/pages/{page_id}/history", response_model=List[WikiHistorySchema])
async def get_page_history(
    page_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    result = await db.execute(
        select(WikiPageHistory)
        .where(WikiPageHistory.page_id == page_id)
        .order_by(WikiPageHistory.created_at.desc())
    )
    return result.scalars().all()

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
import shutil
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional, Any, Annotated
from uuid import UUID
from datetime import datetime, date
import logging
import uuid as uuid_pkg
import os
import re
import unicodedata

from app.api.deps import get_db, require_permission
from app.db.models.daily_report import DailyReport
from app.db.models import User, Group
from app.schemas.daily_report import DailyReportCreate, DailyReport as DailyReportSchema, DailyReportUpdate
from app.utils.security import safe_join, sanitize_filename
from app.services.report_generator import report_generator

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOAD_DIR = "/app/uploads/reports"
TEMPLATE_DIR = "/app/uploads/templates"

# Definimos el esquema de lista aquí mismo para asegurar compatibilidad inmediata
from pydantic import BaseModel
class DailyReportList(BaseModel):
    items: List[dict] # Usamos dict para enviar datos aplanados
    total: int
    page: int
    size: int
    pages: int

@router.get("/", response_model=DailyReportList)
async def read_daily_reports(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("report:view"))],
    page: int = 1,
    size: int = 20,
    shift: Optional[str] = None,
    group_id: Optional[UUID] = None
):
    skip = (page - 1) * size
    query = select(DailyReport).options(selectinload(DailyReport.group))
    
    if group_id:
        query = query.filter(DailyReport.group_id == group_id)
    
    if shift:
        query = query.filter(DailyReport.shift == shift)
            
    # Count total
    total_query = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(total_query)
    total = total_res.scalar_one()

    result = await db.execute(
        query.order_by(DailyReport.date.desc(), DailyReport.shift.desc())
        .offset(skip).limit(size)
    )
    reports = result.scalars().all()
    
    # Aplanamos para que el frontend reciba group_name correctamente
    output = []
    for r in reports:
        d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
        d["group_name"] = r.group.name if r.group else "GENERAL"
        output.append(d)

    import math
    return {
        "items": output,
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if total > 0 else 0
    }

@router.post("/", response_model=DailyReportSchema)
async def create_daily_report(
    report_in: DailyReportCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("report:view"))]
):
    """
    Crea un nuevo informe diario.
    """
    # Prioridad al grupo enviado (si es que viene en report_data o similar) o el del usuario
    target_group_id = current_user.group_id # Por defecto

    res_exists = await db.execute(select(DailyReport).filter(
        DailyReport.date == report_in.date,
        DailyReport.shift == report_in.shift,
        DailyReport.group_id == target_group_id
    ))
    if res_exists.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe un informe para esta fecha y turno.")

    db_obj = DailyReport(
        id=uuid_pkg.uuid4(),
        date=report_in.date,
        shift=report_in.shift,
        report_data=report_in.report_data,
        created_by_id=current_user.id,
        group_id=target_group_id,
        owner_group_id=target_group_id,
        file_path=f"reports/{report_in.date}_{report_in.shift}.pdf"
    )
    
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.post("/upload-legacy")
async def upload_legacy_report(
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
    date_str: Optional[str] = Form(None),
    shift: Optional[str] = Form(None),
    group_id: Optional[UUID] = Form(None),
    current_user: Annotated[User, Depends(require_permission("report:view"))]
):
    """Importa un reporte legacy detectando fecha y turno desde el nombre."""
    # 1. AUTO-DETECCIÓN
    detected_date = None
    detected_shift = None
    
    def normalize_text(text):
        return "".join(c for c in unicodedata.normalize('NFD', text)
                      if unicodedata.category(c) != 'Mn').upper()
    
    filename_norm = normalize_text(file.filename)
    logger.info(f"UPLOAD-LEGACY: Procesando {file.filename}")
    
    date_match = re.search(r"(\d{2})-(\d{2})-(\d{4})", filename_norm)
    if date_match:
        d, m, y = date_match.groups()
        detected_date = f"{y}-{m}-{d}"
    
    if "DIA" in filename_norm: detected_shift = "DIA"
    elif "NOCHE" in filename_norm: detected_shift = "NOCHE"
    
    final_date_str = date_str or detected_date
    final_shift = shift or detected_shift
    
    logger.info(f"UPLOAD-LEGACY: Final Date: {final_date_str}, Final Shift: {final_shift}")

    if not final_date_str or not final_shift:
        logger.warning(f"UPLOAD-LEGACY: Metadata missing for {file.filename}")
        raise HTTPException(
            status_code=400,
            detail={
                "code": "METADATA_MISSING",
                "message": "No se detectó fecha o turno",
                "filename": file.filename,
                "detected": {"date": detected_date, "shift": detected_shift}
            }
        )

    try:
        if "-" in final_date_str:
            parts = final_date_str.split("-")
            if len(parts[0]) == 4: # YYYY-MM-DD
                report_date = datetime.strptime(final_date_str, "%Y-%m-%d").date()
            else: # DD-MM-YYYY
                report_date = datetime.strptime(final_date_str, "%d-%m-%Y").date()
        else:
             raise ValueError("Separador de fecha no reconocido")
    except Exception as e:
         logger.error(f"UPLOAD-LEGACY: Error parseando fecha {final_date_str}: {e}")
         raise HTTPException(status_code=400, detail=f"Formato de fecha inválido: {final_date_str}")

    target_group_id = group_id if group_id else current_user.group_id
    logger.info(f"UPLOAD-LEGACY: Target Group ID: {target_group_id}")
    if not target_group_id:
         raise HTTPException(status_code=400, detail="No se pudo determinar el grupo de destino")

    # 3. LÓGICA DE TURNOS POR GRUPO
    res_g = await db.execute(select(Group).where(Group.id == target_group_id))
    target_group = res_g.scalar_one_or_none()
    
    is_soc = target_group and "SOC" in target_group.name.upper()
    if not is_soc:
        final_shift = "DIA" 

    # 4. DUPLICADOS
    existing_query = select(DailyReport).where(
        DailyReport.date == report_date,
        DailyReport.shift == final_shift,
        DailyReport.group_id == target_group_id
    )
    res_ex = await db.execute(existing_query)
    if res_ex.scalar_one_or_none():
        return None 

    # 5. GUARDADO
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        
    safe_filename = f"Parte_LEGACY_{uuid_pkg.uuid4().hex[:8]}.docx"
    file_path = safe_join(UPLOAD_DIR, sanitize_filename(safe_filename))
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    extracted_text = ""
    try:
        extracted_text = report_generator.extract_text(file_path)
    except Exception as e:
        logger.error(f"Error extrayendo texto legacy: {e}")

    report = DailyReport(
        id=uuid_pkg.uuid4(),
        date=report_date,
        shift=final_shift,
        report_data={"legacy": True},
        file_path=file_path,
        search_content=extracted_text,
        created_by_id=current_user.id,
        group_id=target_group_id,
        owner_group_id=target_group_id
    )
    
    db.add(report)
    await db.commit()
    await db.refresh(report)
    
    # Retornamos un dict aplanado consistente
    return {
        "id": str(report.id),
        "date": report.date.isoformat(),
        "shift": report.shift,
        "group_name": target_group.name if target_group else "GENERAL"
    }

@router.get("/{report_id}", response_model=DailyReportSchema)
async def get_daily_report(
    report_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("report:view"))]
):
    result = await db.execute(select(DailyReport).where(DailyReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Informe no encontrado")
    return report

@router.put("/{report_id}", response_model=DailyReportSchema)
async def update_daily_report(
    report_id: UUID,
    report_in: DailyReportUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("report:view"))]
):
    result = await db.execute(select(DailyReport).where(DailyReport.id == report_id))
    db_obj = result.scalar_one_or_none()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Informe no encontrado")
    
    if report_in.report_data is not None:
        db_obj.report_data = report_in.report_data
    
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_daily_report(
    report_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("report:view"))]
):
    result = await db.execute(select(DailyReport).where(DailyReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Informe no encontrado")
    
    # Borrar archivo físico si existe
    if report.file_path and os.path.exists(report.file_path):
        try:
            os.remove(report.file_path)
        except Exception as e:
            logger.error(f"Error borrando archivo físico {report.file_path}: {e}")

    await db.execute(delete(DailyReport).where(DailyReport.id == report_id))
    await db.commit()
    return None

@router.post("/templates/upload")
async def upload_report_template(
    file: Any,
    group_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:access"))]
):
    """Sube una plantilla personalizada de forma segura (Previene Path Traversal)."""
    if not os.path.exists(TEMPLATE_DIR):
        os.makedirs(TEMPLATE_DIR, exist_ok=True)
    
    filename = f"template_{str(group_id)}.docx"
    try:
        safe_path = safe_join(TEMPLATE_DIR, sanitize_filename(filename))
    except Exception:
        raise HTTPException(status_code=400, detail="ID de grupo inválido")

    with open(safe_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"status": "uploaded", "path": safe_path}

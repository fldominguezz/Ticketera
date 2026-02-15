from fastapi import APIRouter, Depends, HTTPException, status, Query
import shutil
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, delete
from typing import List, Optional, Any, Annotated
from uuid import UUID
from datetime import datetime, date
import logging
import uuid as uuid_pkg
import os

from app.api.deps import get_db, require_permission
from app.db.models.daily_report import DailyReport
from app.db.models import User
from app.schemas.daily_report import DailyReportCreate, DailyReport as DailyReportSchema, DailyReportUpdate
from app.utils.security import safe_join, sanitize_filename

logger = logging.getLogger(__name__)
router = APIRouter()

TEMPLATE_DIR = "/app/uploads/templates"

# Definimos el esquema de lista aquí mismo para asegurar compatibilidad inmediata
from pydantic import BaseModel
class DailyReportList(BaseModel):
    items: List[DailyReportSchema]
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
    shift: Optional[str] = None
):
    skip = (page - 1) * size
    query = select(DailyReport)
    
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
    
    import math
    return {
        "items": reports,
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
    res_exists = await db.execute(select(DailyReport).filter(
        DailyReport.date == report_in.date,
        DailyReport.shift == report_in.shift
    ))
    if res_exists.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe un informe para esta fecha y turno.")

    db_obj = DailyReport(
        id=uuid_pkg.uuid4(),
        date=report_in.date,
        shift=report_in.shift,
        report_data=report_in.report_data,
        created_by_id=current_user.id,
        group_id=current_user.group_id,
        file_path=f"reports/{report_in.date}_{report_in.shift}.pdf"
    )
    
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

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

@router.delete("/{report_id}")
async def delete_daily_report(
    report_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("report:view"))]
):
    await db.execute(delete(DailyReport).where(DailyReport.id == report_id))
    await db.commit()
    return {"status": "success"}

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

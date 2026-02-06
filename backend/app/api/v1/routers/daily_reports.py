from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Annotated, Any, List, Optional
from uuid import UUID
import uuid
import shutil
import os
import json
from datetime import datetime, date
from pydantic import BaseModel

from app.api.deps import get_db, get_current_active_user, require_permission
from app.crud import crud_daily_report
from app.schemas.daily_report import DailyReport as DailyReportSchema, DailyReportInput
from app.services.report_generator import report_generator, LICENSE_MAXS
from app.db.models.user import User
from app.db.models.daily_report import DailyReport, GroupTemplate
from app.services.group_service import group_service

router = APIRouter()

UPLOAD_DIR = "uploads/daily_reports"
TEMPLATE_DIR = "uploads/templates"

from sqlalchemy.orm import selectinload

class DailyReportsPaginated(BaseModel):
    items: List[DailyReportSchema]
    total: int
    page: int
    size: int
    pages: int

@router.get("/", response_model=DailyReportsPaginated)
async def read_daily_reports(
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = 1,
    size: int = 20,
    current_user: User = Depends(get_current_active_user),
    search: Optional[str] = None,
    group_id: Optional[UUID] = None,
    year: Optional[int] = None,
    shift: Optional[str] = None,
    exact_date: Optional[str] = None # format YYYY-MM-DD
) -> Any:
    """
    Retrieve daily reports with advanced filtering and full pagination.
    """
    skip = (page - 1) * size
    query = select(DailyReport).options(selectinload(DailyReport.group))
    
    has_global = current_user.has_permission("partes:read:global")
    has_group = current_user.has_permission("partes:read:group")
    
    if current_user.is_superuser or has_global:
        pass # Full access
    elif has_group:
        child_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
        query = query.filter(or_(DailyReport.group_id.in_(child_ids), DailyReport.owner_group_id.in_(child_ids)))
    else:
        return {"items": [], "total": 0, "page": page, "size": size, "pages": 0}
        
    if search:
        query = query.filter(DailyReport.search_content.ilike(f"%{search}%"))
    
    if group_id:
        query = query.filter(DailyReport.group_id == group_id)
    
    if shift:
        query = query.filter(DailyReport.shift == shift)
        
    if year:
        query = query.filter(func.extract('year', DailyReport.date) == year)

    if exact_date:
        try:
            target_date = datetime.strptime(exact_date, "%Y-%m-%d").date()
            query = query.filter(DailyReport.date == target_date)
        except: pass
        
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
    output = []
    for r in reports:
        report_dict = {c.name: getattr(r, c.name) for c in r.__table__.columns}
        report_dict["group_name"] = r.group.name if r.group else "GENERAL"
        report_dict["date"] = r.date
        report_dict["created_at"] = r.created_at
        output.append(report_dict)
        
    return {
        "items": output,
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if total > 0 else 0
    }

@router.post("/", response_model=DailyReportSchema)
async def create_daily_report(
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    report_in: DailyReportInput,
    current_user: User = Depends(require_permission("partes:create")),
) -> Any:
    """
    Create a new daily report. ONLY ALLOWED FOR SOC GROUP.
    """
    # Security restriction: Only SOC group can create new reports
    from app.db.models import Group
    res_my_group = await db.execute(select(Group).where(Group.id == current_user.group_id))
    my_group = res_my_group.scalar_one_or_none()
    
    if not current_user.is_superuser:
        if not my_group or my_group.name.upper() != "SOC":
            raise HTTPException(
                status_code=403, 
                detail="Acceso Denegado: Solo el personal del SOC puede generar nuevos partes informativos."
            )

    if not current_user.group_id:
        raise HTTPException(status_code=400, detail="User must belong to a group to create a report")

    target_group_id = current_user.group_id
    
    # Logic for Parent Groups creating for Children
    if report_in.group_id and report_in.group_id != current_user.group_id:
        # Verify hierarchy
        allowed_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
        if report_in.group_id not in allowed_ids:
             raise HTTPException(status_code=403, detail="No puedes crear reportes para este grupo (Fuera de jerarquía)")
        target_group_id = report_in.group_id

    report_date = report_in.date or date.today()
    
    # Check if exists for THIS group
    existing_query = select(DailyReport).where(
        DailyReport.date == report_date, 
        DailyReport.shift == report_in.shift,
        DailyReport.group_id == target_group_id
    )
    res_ex = await db.execute(existing_query)
    if res_ex.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe un parte para {report_date} turno {report_in.shift} en el área seleccionada."
        )

    # Buscar plantilla del grupo (Target)
    res_tpl = await db.execute(select(GroupTemplate).where(GroupTemplate.group_id == target_group_id))
    group_tpl = res_tpl.scalar_one_or_none()
    
    template_path = group_tpl.template_path if group_tpl else "templates/parte_informativo_base.docx"
    
    # Obtener nombre del grupo objetivo para el documento y el slug
    res_g = await db.execute(select(Group).where(Group.id == target_group_id))
    target_group = res_g.scalar_one()

    # Prepare context
    context = {
        "date_obj": report_date,
        "TURNO": report_in.shift,
        "GRUPO": target_group.name,
        "ESET_SOC_LIC_USADAS": report_in.eset_soc_lic_usadas,
        "ESET_SOC_MOBILE_USADAS": report_in.eset_soc_mobile_usadas,
        "ESET_BIENESTAR_LIC_USADAS": report_in.eset_bienestar_lic_usadas,
        "EMS_LIC_USADAS": report_in.ems_lic_usadas,
        "ESET_BIENESTAR_INCIDENTES": report_in.eset_bienestar_incidentes,
        "EDR_COLECTORES_WS": report_in.edr_colectores_ws,
        "EDR_COLECTORES_SRV": report_in.edr_colectores_srv,
        "BLOQUEO_SRD": report_in.bloqueo_srd,
        "BLOQUEO_CFD": report_in.bloqueo_cfd,
        "FORTISIEM_SALUD": report_in.fortisiem.health,
        "FORTISIEM_OBS": report_in.fortisiem.obs or "",
        "FORTISANDBOX_SALUD": report_in.fortisandbox.health,
        "FORTISANDBOX_OBS": report_in.fortisandbox.obs or "",
        "EMS_SALUD": report_in.forticlient_ems.health,
        "EMS_OBS": report_in.forticlient_ems.obs or "",
        "FORTIANALYZER_SALUD": report_in.fortianalyzer.health,
        "FORTIANALYZER_OBS": report_in.fortianalyzer.obs or "",
        "FORTIEDR_SALUD": report_in.fortiedr.health,
        "FORTIEDR_OBS": report_in.fortiedr.obs or "",
        "ESET_SOC_SALUD": report_in.eset_soc.health,
        "ESET_SOC_OBS": report_in.eset_soc.obs or "",
        "ESET_BIENESTAR_SALUD": report_in.eset_bienestar.health,
        "ESET_BIENESTAR_OBS": report_in.eset_bienestar.obs or "",
        "CORREO_OBS": report_in.correo_obs or "",
        "NOVEDADES_GENERALES": report_in.novedades_generales,
    }

    group_name_slug = target_group.name.replace(" ", "_")
    filename = f"Parte_{group_name_slug}_{report_date.strftime('%d-%m-%Y')}_{report_in.shift}.docx"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    try:
        report_generator.generate(context, file_path, template_override=template_path)
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Error al generar DOCX: {str(e)}")

    extracted_text = ""
    try: extracted_text = report_generator.extract_text(file_path)
    except: pass

    report = DailyReport(
        date=report_date,
        shift=report_in.shift,
        report_data=json.loads(report_in.model_dump_json()),
        file_path=file_path,
        search_content=extracted_text,
        created_by_id=current_user.id,
        group_id=target_group_id,
        owner_group_id=target_group_id
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    
    # Manual flatten for response
    response_data = report.__dict__.copy()
    response_data["group_name"] = target_group.name
    return response_data

@router.post("/upload-legacy", response_model=Optional[DailyReportSchema])
async def upload_legacy_report(
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
    date_str: Optional[str] = Form(None),
    shift: Optional[str] = Form(None),
    group_id: Optional[UUID] = Form(None),
    current_user: User = Depends(require_permission("partes:create")),
) -> Any:
    import re
    import unicodedata
    detected_date = None
    detected_shift = None
    
    # Normalizar nombre de archivo para quitar acentos
    def normalize_text(text):
        return "".join(c for c in unicodedata.normalize('NFD', text)
                      if unicodedata.category(c) != 'Mn').upper()

    filename_norm = normalize_text(file.filename)
    
    date_match = re.search(r"(\d{2})-(\d{2})-(\d{4})", filename_norm)
    if date_match:
        d, m, y = date_match.groups()
        detected_date = f"{y}-{m}-{d}"
        
    if "DIA" in filename_norm: detected_shift = "DIA"
    elif "NOCHE" in filename_norm: detected_shift = "NOCHE"
            
    final_date_str = date_str or detected_date
    final_shift = shift or detected_shift
    
    if not final_date_str or not final_shift:
        raise HTTPException(status_code=400, detail="No se detectó fecha/turno")

    try: report_date = datetime.strptime(final_date_str, "%Y-%m-%d").date()
    except: report_date = datetime.strptime(final_date_str, "%d-%m-%Y").date()

    target_group_id = current_user.group_id
    if group_id and group_id != current_user.group_id:
        allowed_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
        if group_id not in allowed_ids:
             raise HTTPException(status_code=403, detail="No tienes permiso sobre este grupo")
        target_group_id = group_id

    # VERIFICACIÓN DE DUPLICADOS
    existing_query = select(DailyReport).where(
        DailyReport.date == report_date,
        DailyReport.shift == final_shift,
        DailyReport.group_id == target_group_id
    )
    res_ex = await db.execute(existing_query)
    if res_ex.scalar_one_or_none():
        return None # El frontend interpretará esto como 'Omitido / Duplicado'

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"Parte_LEGACY_{uuid.uuid4().hex[:8]}.docx"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer: shutil.copyfileobj(file.file, buffer)

    extracted_text = ""
    try: extracted_text = report_generator.extract_text(file_path)
    except: pass
        
    report = DailyReport(
        date=report_date, shift=final_shift,
        report_data={"legacy": True},
        file_path=file_path, search_content=extracted_text,
        created_by_id=current_user.id, group_id=target_group_id,
        owner_group_id=target_group_id
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    
    # Reload to fetch group name for consistent response if needed
    res = await db.execute(select(DailyReport).where(DailyReport.id == report.id).options(selectinload(DailyReport.group)))
    report = res.scalar_one()
    return report

@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_daily_report(
    report_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(require_permission("admin:settings:manage"))
):
    report = await crud_daily_report.daily_report.get(db=db, id=report_id)
    if not report: raise HTTPException(status_code=404)
    if report.file_path and os.path.exists(report.file_path): os.remove(report.file_path)
    await crud_daily_report.daily_report.remove(db=db, id=report_id)
    return None

@router.get("/{report_id}/download")
async def download_report(
    report_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(get_current_active_user),
):
    report = await crud_daily_report.daily_report.get(db=db, id=report_id)
    if not report: raise HTTPException(status_code=404)
    
    has_global = current_user.has_permission("partes:read:global")
    has_group = current_user.has_permission("partes:read:group")
    
    if not current_user.is_superuser and not has_global:
        child_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
        if report.group_id not in child_ids and report.owner_group_id not in child_ids:
            raise HTTPException(status_code=403)

    return FileResponse(report.file_path, filename=os.path.basename(report.file_path))

@router.post("/config/template/{group_id}")
async def upload_group_template(
    group_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission("admin:settings:manage"))
):
    os.makedirs(TEMPLATE_DIR, exist_ok=True)
    path = os.path.join(TEMPLATE_DIR, f"template_{str(group_id)}.docx")
    with open(path, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
    from app.db.session import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(GroupTemplate).where(GroupTemplate.group_id == group_id))
        db_tpl = res.scalar_one_or_none()
        if not db_tpl:
            db_tpl = GroupTemplate(group_id=group_id, template_path=path)
            session.add(db_tpl)
        else: db_tpl.template_path = path
        await session.commit()
    return {"status": "ok"}
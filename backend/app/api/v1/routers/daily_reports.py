from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated, Any, List, Optional
from uuid import UUID
import shutil
import os
import json
from datetime import datetime, date

from app.api import deps
from app.crud import crud_daily_report
from app.schemas.daily_report import DailyReport as DailyReportSchema, DailyReportInput
from app.services.report_generator import report_generator, LICENSE_MAXS
from app.db.models.user import User
from app.db.models.daily_report import DailyReport

router = APIRouter()

UPLOAD_DIR = "uploads/daily_reports"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/", response_model=List[DailyReportSchema])
async def read_daily_reports(
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
    search: Optional[str] = None
) -> Any:
    """
    Retrieve daily reports.
    """
    if search:
        return await crud_daily_report.daily_report.search(db=db, query=search, skip=skip, limit=limit)
    return await crud_daily_report.daily_report.get_multi(db=db, skip=skip, limit=limit)

@router.post("/", response_model=DailyReportSchema)
async def create_daily_report(
    *,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    report_in: DailyReportInput,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create a new daily report and generate DOCX.
    """
    report_date = report_in.date or date.today()
    
    # Check if exists
    existing = await crud_daily_report.daily_report.get_by_date_and_shift(db, date=report_date, shift=report_in.shift)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A report for {report_date} and shift {report_in.shift} already exists."
        )

    # Prepare data for template
    context = {
        "date_obj": report_date,
        "TURNO": report_in.shift,
        
        # Licenses
        "ESET_SOC_LIC_USADAS": report_in.eset_soc_lic_usadas,
        "ESET_SOC_MOBILE_USADAS": report_in.eset_soc_mobile_usadas,
        "ESET_BIENESTAR_LIC_USADAS": report_in.eset_bienestar_lic_usadas,
        "EMS_LIC_USADAS": report_in.ems_lic_usadas,
        
        # Counters/Incidentes
        "ESET_BIENESTAR_INCIDENTES": report_in.eset_bienestar_incidentes,
        "EDR_COLECTORES_WS": report_in.edr_colectores_ws,
        "EDR_COLECTORES_SRV": report_in.edr_colectores_srv,
        "BLOQUEO_SRD": report_in.bloqueo_srd,
        "BLOQUEO_CFD": report_in.bloqueo_cfd,

        # Tool Health & Obs
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

    # Filename
    filename = f"Parte_Informativo_{report_date.strftime('%d-%m-%Y')}_Turno_{report_in.shift}.docx"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    # Generate
    try:
        report_generator.generate(context, file_path)
    except Exception as e:
         import traceback
         print(f"REPORT GENERATION ERROR: {str(e)}")
         traceback.print_exc()
         raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

    # Extract text
    try:
        extracted_text = report_generator.extract_text(file_path)
    except Exception as e:
        extracted_text = ""
        print(f"Extraction error: {e}")

    # Create DB record
    try:
        report = DailyReport(
            date=report_date,
            shift=report_in.shift,
            report_data=json.loads(report_in.model_dump_json()),
            file_path=file_path,
            search_content=extracted_text,
            created_by_id=current_user.id
        )
        return await crud_daily_report.daily_report.create(db, obj_in=report)
    except Exception as e:
        import traceback
        print(f"DB RECORD CREATION ERROR: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to save report to DB: {str(e)}")

@router.post("/upload", response_model=DailyReportSchema)
async def upload_legacy_report(
    *,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    file: UploadFile = File(...),
    date_str: Optional[str] = Form(None, description="YYYY-MM-DD"),
    shift: Optional[str] = Form(None, pattern="^(DIA|NOCHE)$"),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Upload a legacy DOCX report. Auto-detects date and shift from filename if not provided.
    """
    import re
    
    detected_date = None
    detected_shift = None
    
    # Try to parse from filename if not provided
    if not date_str or not shift:
        filename_upper = file.filename.upper()
        
        # Look for date pattern DD-MM-YYYY
        date_match = re.search(r"(\d{2})-(\d{2})-(\d{4})", filename_upper)
        if date_match:
            d, m, y = date_match.groups()
            detected_date = f"{y}-{m}-{d}"
            
        # Look for shift pattern
        if "DIA" in filename_upper:
            detected_shift = "DIA"
        elif "NOCHE" in filename_upper:
            detected_shift = "NOCHE"
            
    final_date_str = date_str or detected_date
    final_shift = shift or detected_shift
    
    if not final_date_str or not final_shift:
        raise HTTPException(
            status_code=400, 
            detail="No se pudo detectar la fecha o el turno del nombre del archivo. Por favor, especifíquelos manualmente."
        )

    try:
        report_date = datetime.strptime(final_date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD")

    existing = await crud_daily_report.daily_report.get_by_date_and_shift(db, date=report_date, shift=final_shift)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe un parte para la fecha {report_date} y turno {final_shift}."
        )

    filename = f"Parte_Informativo_{report_date.strftime('%d-%m-%Y')}_Turno_{shift}_LEGACY.docx"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Extract text
    try:
        extracted_text = report_generator.extract_text(file_path)
    except Exception as e:
        extracted_text = ""
        
    report = DailyReport(
        date=report_date,
        shift=shift,
        report_data={"legacy": True, "original_filename": file.filename},
        file_path=file_path,
        search_content=extracted_text,
        created_by_id=current_user.id
    )
    return await crud_daily_report.daily_report.create(db, obj_in=report)

@router.get("/{report_id}/download")
async def download_report(
    report_id: UUID,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: User = Depends(deps.get_current_active_user),
):
    report = await crud_daily_report.daily_report.get(db=db, id=report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found on server")
        
    return FileResponse(
        report.file_path, 
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
        filename=os.path.basename(report.file_path)
    )

@router.get("/config/licenses")
async def get_license_config(
    current_user: User = Depends(deps.get_current_active_user),
):
    return LICENSE_MAXS

@router.post("/template")
async def upload_base_template(
    *,
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_superuser),
):
    """
    Upload and replace the base DOCX template. Only for superusers.
    """
    if not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un .docx")
    
    template_path = "templates/parte_informativo_base.docx"
    os.makedirs("templates", exist_ok=True)
    
    with open(template_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"detail": "Plantilla base actualizada correctamente"}
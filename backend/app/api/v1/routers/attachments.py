from app.utils.security import safe_join, sanitize_filename
from typing import Annotated, List
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
import shutil
import os
from app.api.deps import get_db, get_current_active_user
from app.db.models import User, Attachment as AttachmentModel
from app.core.config import settings
from fastapi.responses import FileResponse

router = APIRouter()

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload-temp")
async def upload_temp_attachment(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    file: UploadFile = File(...),
):
    file_id = uuid.uuid4()
    file_path = safe_join(UPLOAD_DIR, f"temp_{file_id}_{sanitize_filename(file.filename)}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    db_obj = AttachmentModel(
        id=file_id,
        ticket_id=None, # Temporal
        uploaded_by_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        content_type=file.content_type,
        size=os.path.getsize(file_path)
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.post("/{ticket_id}")
async def upload_attachment(
    ticket_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    file: UploadFile = File(...),
):
    file_id = uuid.uuid4()
    file_path = safe_join(UPLOAD_DIR, f"{file_id}_{sanitize_filename(file.filename)}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    db_obj = AttachmentModel(
        id=file_id,
        ticket_id=ticket_id,
        uploaded_by_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        content_type=file.content_type,
        size=os.path.getsize(file_path)
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)

    from app.crud import crud_audit
    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="attachment_added",
        details={"ticket_id": str(ticket_id), "filename": file.filename, "size": db_obj.size}
    )
    
    return db_obj

@router.get("/{ticket_id}")
async def list_attachments(
    ticket_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    from sqlalchemy.future import select
    result = await db.execute(select(AttachmentModel).filter(AttachmentModel.ticket_id == ticket_id))
    return result.scalars().all()

@router.get("/download/{attachment_id}")
async def download_attachment(
    attachment_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    from sqlalchemy.future import select
    result = await db.execute(select(AttachmentModel).filter(AttachmentModel.id == attachment_id))
    db_obj = result.scalar_one_or_none()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Attachment not found")
        
    if not os.path.exists(db_obj.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
        
    return FileResponse(
        path=db_obj.file_path,
        filename=db_obj.filename,
        media_type=db_obj.content_type
    )

@router.get("/daily_reports/{file_name}")
async def get_daily_report_pdf(
    file_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Fix path: "uploads/daily_reports" is used in daily_reports.py, so it's relative to app root
    # But here UPLOAD_DIR is "/app/uploads".
    # Let's ensure consistency.
    
    file_path = safe_join(UPLOAD_DIR, "daily_reports", sanitize_filename(file_name))
    if not os.path.exists(file_path):
        # Fallback to absolute if relative fails
        file_path = os.path.join(UPLOAD_DIR, "daily_reports", file_name)
        
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    media_type = "application/pdf"
    if file_name.endswith(".docx"):
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif file_name.endswith(".doc"):
        media_type = "application/msword"
        
    return FileResponse(path=file_path, media_type=media_type, filename=file_name)
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

router = APIRouter()

UPLOAD_DIR = "/root/Ticketera/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/{ticket_id}")
async def upload_attachment(
    ticket_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    file: UploadFile = File(...),
):
    file_id = uuid.uuid4()
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}_{file.filename}")
    
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

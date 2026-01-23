from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

from app.db.models.form import Form, FormSubmission
from app.schemas.form import FormCreate, FormUpdate, FormSubmissionCreate

class CRUDForm:
    async def get(self, db: AsyncSession, id: UUID) -> Optional[Form]:
        result = await db.execute(select(Form).filter(Form.id == id, Form.deleted_at == None))
        return result.scalar_one_or_none()

    async def get_multi(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Form]:
        result = await db.execute(select(Form).filter(Form.deleted_at == None).offset(skip).limit(limit))
        return result.scalars().all()

    async def create(self, db: AsyncSession, obj_in: FormCreate, created_by_id: UUID) -> Form:
        db_obj = Form(**obj_in.model_dump(), created_by_id=created_by_id)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def create_submission(self, db: AsyncSession, obj_in: FormSubmissionCreate, submitted_by_id: UUID) -> FormSubmission:
        db_obj = FormSubmission(**obj_in.model_dump(), submitted_by_id=submitted_by_id)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get_submissions(self, db: AsyncSession, form_id: UUID) -> List[FormSubmission]:
        result = await db.execute(select(FormSubmission).filter(FormSubmission.form_id == form_id))
        return result.scalars().all()

form = CRUDForm()

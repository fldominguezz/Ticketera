from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, desc
from app.db.models.daily_report import DailyReport
from app.schemas.daily_report import DailyReportCreate, DailyReportUpdate

class CRUDDailyReport:
    async def get_by_date_and_shift(self, db: AsyncSession, *, date: str, shift: str) -> Optional[DailyReport]:
        result = await db.execute(
            select(DailyReport).filter(DailyReport.date == date, DailyReport.shift == shift)
        )
        return result.scalar_one_or_none()

    async def get(self, db: AsyncSession, id: UUID) -> Optional[DailyReport]:
        result = await db.execute(select(DailyReport).filter(DailyReport.id == id))
        return result.scalar_one_or_none()

    async def get_multi(self, db: AsyncSession, *, skip: int = 0, limit: int = 100) -> List[DailyReport]:
        result = await db.execute(
            select(DailyReport).order_by(desc(DailyReport.date)).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def search(self, db: AsyncSession, *, query: str, skip: int = 0, limit: int = 100) -> List[DailyReport]:
        result = await db.execute(
            select(DailyReport)
            .filter(
                or_(
                    DailyReport.search_content.ilike(f"%{query}%"),
                )
            )
            .order_by(desc(DailyReport.date))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def create(self, db: AsyncSession, *, obj_in: DailyReport) -> DailyReport:
        db.add(obj_in)
        await db.commit()
        await db.refresh(obj_in)
        return obj_in

    async def remove(self, db: AsyncSession, *, id: UUID) -> Optional[DailyReport]:
        obj = await self.get(db, id)
        if obj:
            await db.delete(obj)
            await db.commit()
        return obj

daily_report = CRUDDailyReport()
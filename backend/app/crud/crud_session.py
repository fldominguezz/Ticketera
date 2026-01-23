from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from typing import List, Optional

from app.db.models import Session, User

class CRUDSession:
    async def create_session(
        self, db: AsyncSession, *, user_id: UUID, ip_address: str, user_agent: str
    ) -> Session:
        """Creates and stores a new session record."""
        session = Session(
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session

    async def get_active_sessions(self, db: AsyncSession, *, user_id: UUID) -> List[Session]:
        """Gets all active sessions for a specific user."""
        result = await db.execute(
            select(Session)
            .where(Session.user_id == user_id, Session.is_active == True)
            .order_by(Session.last_activity_at.desc())
        )
        return result.scalars().all()

    async def get_session_by_id(self, db: AsyncSession, *, session_id: UUID) -> Optional[Session]:
        """Gets a session by its ID."""
        result = await db.execute(select(Session).where(Session.id == session_id))
        return result.scalar_one_or_none()

    async def deactivate_session(self, db: AsyncSession, *, session_id: UUID) -> Optional[Session]:
        """Marks a specific session as inactive."""
        session = await self.get_session_by_id(db, session_id=session_id)
        if session:
            session.is_active = False
            db.add(session)
            await db.commit()
            await db.refresh(session)
        return session

    async def deactivate_other_sessions(
        self, db: AsyncSession, *, user_id: UUID, current_session_id: UUID
    ) -> int:
        """Deactivates all sessions for a user except the current one."""
        sessions_to_deactivate = await db.execute(
            select(Session).where(
                Session.user_id == user_id,
                Session.is_active == True,
                Session.id != current_session_id
            )
        )
        count = 0
        for session in sessions_to_deactivate.scalars().all():
            session.is_active = False
            db.add(session)
            count += 1
        
        if count > 0:
            await db.commit()
            
        return count

session = CRUDSession()

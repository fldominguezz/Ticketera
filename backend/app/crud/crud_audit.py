from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.audit_log import AuditLog
from app.schemas.auth import AuditLogCreate # I will create this schema
from uuid import UUID
from typing import Optional

class CRUDAuditLog:
    def _clean_details(self, details: Optional[dict]) -> Optional[dict]:
        if not details:
            return details
        
        # Copia profunda simple para no modificar el original
        cleaned = {**details}
        sensitive_keys = ["password", "token", "secret", "hashed_password", "interim_token", "access_token"]
        
        for key in list(cleaned.keys()):
            if any(s in key.lower() for s in sensitive_keys):
                cleaned[key] = "********"
        return cleaned

    async def create_log(
        self,
        db: AsyncSession,
        *,
        user_id: Optional[UUID],
        event_type: str,
        ip_address: Optional[str] = None,
        details: Optional[dict] = None
    ) -> AuditLog:
        log_entry = AuditLog(
            user_id=user_id,
            event_type=event_type,
            ip_address=ip_address,
            details=self._clean_details(details)
        )
        db.add(log_entry)
        await db.commit()
        await db.refresh(log_entry)
        return log_entry

audit_log = CRUDAuditLog()

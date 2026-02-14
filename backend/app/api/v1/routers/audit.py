from typing import Annotated, List, Optional, Any, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.api.deps import get_db, require_permission
from app.db.models import AuditLog, User
from app.services.group_service import group_service
from app.schemas.audit import AuditLogSchema
from uuid import UUID
from datetime import datetime

router = APIRouter()

def calculate_diff(old_state: Any, new_state: Any) -> Dict[str, Any]:
    """Calcula las diferencias entre dos estados JSON."""
    if not isinstance(old_state, dict) or not isinstance(new_state, dict):
        return {}
    
    diff = {}
    # Obtener todas las llaves únicas
    all_keys = set(old_state.keys()) | set(new_state.keys())
    
    for key in all_keys:
        old_val = old_state.get(key)
        new_val = new_state.get(key)
        
        if old_val != new_val:
            diff[key] = {
                "before": old_val,
                "after": new_val
            }
    return diff

@router.get("", response_model=List[AuditLogSchema])
async def read_audit_logs(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("audit:read"))],
    ticket_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
):
    query = select(AuditLog).options(selectinload(AuditLog.user))
    
    # Lógica de jerarquía para Auditoría
    if not current_user.is_superuser:
        if not current_user.group_id:
            return []
        group_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
        query = query.join(User, AuditLog.user_id == User.id).filter(User.group_id.in_(group_ids))

    if ticket_id:
        # Filtrar logs donde el ticket_id esté dentro del campo JSONB details
        query = query.filter(AuditLog.details["ticket_id"].astext == str(ticket_id))
    
    result = await db.execute(
        query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    )
    db_logs = result.scalars().all()
    
    # Procesar logs para añadir Diff y Username
    processed_logs = []
    for log in db_logs:
        log_dict = AuditLogSchema.model_validate(log).model_dump()
        log_dict["username"] = log.user.username if log.user else "System"
        
        # Calcular Diff si hay old_state y new_state en details
        details = log.details or {}
        if isinstance(details, dict) and "old_state" in details and "new_state" in details:
            log_dict["diff"] = calculate_diff(details["old_state"], details["new_state"])
        
        processed_logs.append(log_dict)
        
    return processed_logs

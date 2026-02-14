from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.api.deps import get_db, get_current_active_user
from app.crud import crud_session, crud_audit
from app.db.models import User
from app.schemas.auth import ActiveSessionsResponse
from jose import jwt
from app.core.config import settings
router = APIRouter()
@router.get("/me", response_model=ActiveSessionsResponse)
async def get_my_sessions(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Retrieve all active sessions for the current user.
    """
    token = request.headers['authorization'].split(' ')[1]
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_aud": False})
    current_session_id = UUID(payload.get("sid"))
    sessions = await crud_session.session.get_active_sessions(db, user_id=current_user.id)
    current_session = None
    other_sessions = []
    for s in sessions:
        if s.id == current_session_id:
            current_session = s
        else:
            other_sessions.append(s)
    if not current_session:
        raise HTTPException(status_code=404, detail="Current session not found")
    return ActiveSessionsResponse(
        current_session={
            "id": str(current_session.id),
            "ip_address": str(current_session.ip_address) if current_session.ip_address else None,
            "created_at": str(current_session.created_at),
            "last_activity_at": str(current_session.last_activity_at),
            "is_active": current_session.is_active,
        },
        other_sessions=[
            {
                "id": str(s.id),
                "ip_address": str(s.ip_address) if s.ip_address else None,
                "created_at": str(s.created_at),
                "last_activity_at": str(s.last_activity_at),
                "is_active": s.is_active,
            }
            for s in other_sessions
        ]
    )
@router.post("/me/logout")
async def logout_my_session(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Logout the current session.
    """
    token = request.headers['authorization'].split(' ')[1]
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_aud": False})
    current_session_id = UUID(payload.get("sid"))
    deactivated_session = await crud_session.session.deactivate_session(db, session_id=current_session_id)
    if not deactivated_session:
        raise HTTPException(status_code=404, detail="Session not found")
    await crud_audit.audit_log.create_log(
        db, 
        user_id=current_user.id, 
        event_type="logout", 
        ip_address=request.client.host,
        details={"session_id": str(current_session_id)}
    )
    return {"status": "success", "detail": "Session logged out"}
@router.post("/me/logout-others")
async def logout_other_sessions(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Logout all other active sessions for the current user.
    """
    token = request.headers['authorization'].split(' ')[1]
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_aud": False})
    current_session_id = UUID(payload.get("sid"))
    count = await crud_session.session.deactivate_other_sessions(
        db, user_id=current_user.id, current_session_id=current_session_id
    )
    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="logout_others",
        ip_address=request.client.host,
        details={"deactivated_sessions_count": count}
    )
    return {"status": "success", "detail": f"{count} other sessions logged out."}
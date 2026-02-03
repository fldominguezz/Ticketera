from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from uuid import UUID

from app.api.deps import require_permission, get_db
from app.services.expert_analysis_service import expert_analysis_service
from app.crud import crud_ticket
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import User

router = APIRouter()

class AISummaryRequest(BaseModel):
    ticket_id: UUID

class AISummaryResponse(BaseModel):
    summary: str

class AIRemediationResponse(BaseModel):
    remediation_steps: str

@router.post("/summarize", response_model=AISummaryResponse)
async def summarize_ticket(
    req: AISummaryRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("ticket:read"))],
):
    """
    Generate an Expert summary for a specific ticket or alert by scanning raw logs.
    """
    # Try to find in alerts first
    from app.db.models.alert import Alert
    from sqlalchemy.future import select
    res = await db.execute(select(Alert).where(Alert.id == req.ticket_id))
    alert = res.scalar_one_or_none()
    
    raw_content = ""
    if alert:
        raw_content = alert.raw_log or alert.description
    else:
        # Try to find in tickets
        ticket = await crud_ticket.ticket.get(db, id=req.ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Entity not found")
        raw_content = ticket.description

    analysis = expert_analysis_service.analyze_raw_log(raw_content)
    return {"summary": analysis["summary"]}

@router.post("/remediation", response_model=AIRemediationResponse)
async def suggest_remediation(
    req: AISummaryRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("ticket:read"))],
):
    """
    Generate Expert remediation steps by scanning raw logs.
    """
    from app.db.models.alert import Alert
    from sqlalchemy.future import select
    res = await db.execute(select(Alert).where(Alert.id == req.ticket_id))
    alert = res.scalar_one_or_none()
    
    raw_content = ""
    if alert:
        raw_content = alert.raw_log or alert.description
    else:
        ticket = await crud_ticket.ticket.get(db, id=req.ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Entity not found")
        raw_content = ticket.description

    analysis = expert_analysis_service.analyze_raw_log(raw_content)
    return {"remediation_steps": analysis["recommendation"]}

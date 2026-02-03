from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from uuid import UUID

from app.api.deps import require_permission, get_db
from app.services.ai_service import ai_service
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
    Generate an AI summary for a specific ticket or alert.
    """
    # Try to find in tickets
    ticket = await crud_ticket.ticket.get(db, id=req.ticket_id)
    title, description, comments_text = "", "", ""
    
    if ticket:
        title = ticket.title
        description = ticket.description
        # Fetch comments to give context
        comments = await crud_ticket.ticket.get_comments(db, ticket_id=ticket.id)
        comments_text = "\n".join([c.content for c in comments[:5]])
    else:
        # Try to find in alerts
        from app.db.models.alert import Alert
        from sqlalchemy.future import select
        res = await db.execute(select(Alert).where(Alert.id == req.ticket_id))
        alert = res.scalar_one_or_none()
        if not alert:
            raise HTTPException(status_code=404, detail="Entity not found")
        title = alert.rule_name
        description = f"{alert.description}\n\nRAW LOG:\n{alert.raw_log}"

    summary = await ai_service.summarize_ticket(
        title=title, 
        description=description, 
        comments=comments_text
    )
    
    return {"summary": summary}

@router.post("/remediation", response_model=AIRemediationResponse)
async def suggest_remediation(
    req: AISummaryRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("ticket:read"))],
):
    """
    Generate AI remediation steps for a specific ticket or alert.
    """
    # Try to find in tickets
    ticket = await crud_ticket.ticket.get(db, id=req.ticket_id)
    title, description = "", ""
    
    if ticket:
        title = ticket.title
        description = ticket.description
    else:
        # Try to find in alerts (the table we just separated)
        from app.db.models.alert import Alert
        from sqlalchemy.future import select
        res = await db.execute(select(Alert).where(Alert.id == req.ticket_id))
        alert = res.scalar_one_or_none()
        if not alert:
            raise HTTPException(status_code=404, detail="Entity not found")
        title = alert.rule_name
        description = f"{alert.description}\n\nRAW LOG:\n{alert.raw_log}"

    steps = await ai_service.suggest_remediation(
        title=title,
        description=description
    )
    
    return {"remediation_steps": steps}

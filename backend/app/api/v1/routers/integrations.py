from typing import Annotated, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.api.deps import get_db
from app.crud import crud_audit
from app.db.models import Ticket, TicketType, User, Group
from app.db.models.endpoint import Endpoint
from sqlalchemy.future import select

router = APIRouter()

@router.post("/fortisiem/webhook")
async def fortisiem_webhook(
    request: Request,
    payload: Dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Receive events from FortiSIEM.
    """
    # 1. Audit the raw event
    await crud_audit.audit_log.create_log(
        db,
        user_id=None,
        event_type="fortisiem_event_received",
        ip_address=request.client.host,
        details=payload
    )
    
    # 2. Basic Normalization
    hostname = payload.get("hostName") or payload.get("ip")
    
    # 3. Correlation with endpoints
    endpoint = None
    if hostname:
        result = await db.execute(
            select(Endpoint).filter(
                (Endpoint.hostname == hostname) | (Endpoint.ip_address == hostname)
            )
        )
        endpoint = result.scalar_one_or_none()

    # 4. Rules engine (Example)
    severity = payload.get("severity")
    if severity and int(severity) >= 7:
        # Get Alerta SIEM type
        result = await db.execute(select(TicketType).filter(TicketType.name == "Alerta SIEM"))
        ticket_type = result.scalar_one_or_none()
        
        if not ticket_type:
            ticket_type = TicketType(name="Alerta SIEM", color="red")
            db.add(ticket_type)
            await db.flush()

        # Get System User
        result = await db.execute(select(User).filter(User.username == "system"))
        system_user = result.scalar_one_or_none()
        
        # Get Root Group
        result = await db.execute(select(Group).filter(Group.parent_id == None))
        root_group = result.scalar_one_or_none()

        if not system_user or not root_group:
            # This should ideally be seeded
            return {"status": "error", "detail": "System user or root group not found"}

        new_ticket = Ticket(
            title=f"FortiSIEM Alert: {payload.get('eventName', 'Unknown Event')}",
            description=f"Automated ticket from FortiSIEM integration.\nDetails: {payload}",
            status="open",
            priority="high",
            ticket_type_id=ticket_type.id,
            group_id=endpoint.group_id if endpoint else root_group.id,
            created_by_id=system_user.id,
        )
        
        if endpoint:
            # We can't use .append directly here because it's M2M with secondary table
            # and we might need to flush or handle it differently in async
            # But SQLAlchemy handles it if we are in the same session
            new_ticket.endpoints.append(endpoint)
            
        db.add(new_ticket)
        await db.commit()
        
    return {"status": "success", "correlated_endpoint": str(endpoint.id) if endpoint else None}

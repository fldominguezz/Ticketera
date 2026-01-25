from typing import Annotated, List, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.api.deps import get_db, get_current_active_user
from app.crud import crud_form, crud_audit, crud_ticket, crud_endpoint
from app.db.models import User, TicketType
from app.schemas.form import Form, FormCreate, FormUpdate, FormSubmission, FormSubmissionCreate
from app.schemas.ticket import TicketCreate
from app.schemas.endpoint import EndpointCreate
from sqlalchemy.future import select

router = APIRouter()

@router.get("", response_model=List[Form])
async def read_forms(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    return await crud_form.form.get_multi(db)

@router.post("", response_model=Form)
async def create_form(
    form_in: FormCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    return await crud_form.form.create(db, obj_in=form_in, created_by_id=current_user.id)

@router.post("/{form_id}/submit", response_model=FormSubmission)
async def submit_form(
    form_id: UUID,
    submission_data: dict,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    form_db = await crud_form.form.get(db, id=form_id)
    if not form_db:
        raise HTTPException(status_code=404, detail="Form not found")
    
    # 1. Create submission record
    sub_in = FormSubmissionCreate(
        form_id=form_id,
        data=submission_data,
        group_id=current_user.group_id
    )
    submission = await crud_form.form.create_submission(db, obj_in=sub_in, submitted_by_id=current_user.id)
    
    # 2. Automation Logic (The requested Multi-Device Installation)
    # If the form has automation rules defined...
    if form_db.automation_rules:
        rules = form_db.automation_rules
        
        # Example: Multi-device installation logic
        if rules.get("type") == "multi_device_installation":
            devices = submission_data.get("devices", [])
            
            # Get Ticket Type for Installation
            res = await db.execute(select(TicketType).filter(TicketType.name == "Instalación AV"))
            ttype = res.scalar_one_or_none()
            
            # Create Parent Ticket
            parent_ticket = await crud_ticket.ticket.create(db, obj_in=TicketCreate(
                title=f"Instalación Multi-Equipo: {submission_data.get('division', 'General')}",
                description=f"Formulario enviado por {current_user.username}",
                ticket_type_id=ttype.id if ttype else None,
                group_id=current_user.group_id,
                priority="medium"
            ), created_by_id=current_user.id)
            
            submission.created_ticket_id = parent_ticket.id
            
            for dev in devices:
                # Create Endpoint
                new_ep = await crud_endpoint.endpoint.create(db, obj_in=EndpointCreate(
                    hostname=dev.get("hostname"),
                    ip_address=dev.get("ip"),
                    mac_address=dev.get("mac"),
                    group_id=current_user.group_id,
                    product=dev.get("product"),
                    observations=dev.get("observations")
                ))
                
                # Create Sub-ticket
                await crud_ticket.ticket.create(db, obj_in=TicketCreate(
                    title=f"Instalación en {dev.get('hostname')}",
                    description=f"Detalle de instalación individual.",
                    ticket_type_id=ttype.id if ttype else None,
                    group_id=current_user.group_id,
                    parent_ticket_id=parent_ticket.id,
                    priority="low"
                ), created_by_id=current_user.id)
            
            await db.commit()

    return submission

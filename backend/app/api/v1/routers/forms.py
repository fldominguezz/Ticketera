from typing import Annotated, List, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.api.deps import get_db, require_permission, require_role
from app.crud import crud_form, crud_audit, crud_ticket, crud_endpoint
from app.db import models
from app.schemas.form import Form, FormCreate, FormUpdate, FormSubmission, FormSubmissionCreate
from app.schemas.ticket import TicketCreate
from app.schemas.endpoint import EndpointCreate
from sqlalchemy.future import select

router = APIRouter()

@router.get(
    "",
    response_model=List[Form],
    dependencies=[Depends(require_role(['owner', 'admin', 'Administrator', 'analyst', 'tech', 'viewer']))]
)
async def read_forms(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[models.User, Depends(require_permission("forms:read:all"))],
):
    """
    Retorna solo las plantillas disponibles para el grupo del usuario.
    """
    if current_user.is_superuser:
        return await crud_form.form.get_multi(db)
    
    # Filtrar por grupo del usuario
    res = await db.execute(
        select(models.Form).filter(
            (models.Form.group_id == current_user.group_id) | (models.Form.group_id == None)
        ).filter(models.Form.deleted_at == None)
    )
    return res.scalars().all()

@router.post(
    "",
    response_model=Form,
    dependencies=[Depends(require_role(['owner', 'admin', 'Administrator']))]
)
async def create_form(
    form_in: FormCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[models.User, Depends(require_permission("forms:create"))],
    request: Request,
):
    form = await crud_form.form.create(db, obj_in=form_in, created_by_id=current_user.id)
    
    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="form_template_created",
        ip_address=request.client.host,
        details={"form_id": str(form.id), "name": form.name}
    )
    return form

@router.post(
    "/{form_id}/submit",
    response_model=FormSubmission,
    dependencies=[Depends(require_role(['owner', 'admin', 'Administrator', 'analyst', 'tech']))] # Only these roles can submit forms that trigger automation
)
async def submit_form(
    form_id: UUID,
    submission_data: dict,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[models.User, Depends(require_permission("forms:submit"))],
    request: Request,
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
    
    # Audit submission
    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="form_submitted",
        ip_address=request.client.host,
        details={"form_id": str(form_id), "form_name": form_db.name}
    )
    
    # 2. Automation Logic (The requested Multi-Device Installation)
    # If the form has automation rules defined...
    if form_db.automation_rules:
        rules = form_db.automation_rules
        
        # Example: Multi-device installation logic
        if rules.get("type") == "multi_device_installation":
            devices = submission_data.get("devices", [])
            gde_number = submission_data.get("gde_number") or submission_data.get("expediente")
            
            expediente_obj = None
            if gde_number:
                # Buscar o crear expediente
                from app.crud import crud_expediente
                from app.schemas.expediente import ExpedienteCreate
                res_exp = await db.execute(select(models.Expediente).where(models.Expediente.number == gde_number))
                expediente_obj = res_exp.scalar_one_or_none()
                if not expediente_obj:
                    expediente_obj = await crud_expediente.expediente.create(db, obj_in=ExpedienteCreate(
                        number=gde_number,
                        title=f"Expediente de Instalación: {submission_data.get('division', 'General')}",
                        description=f"Creado automáticamente desde formulario por {current_user.username}"
                    ))

            # Get Ticket Type for Installation
            res = await db.execute(select(models.TicketType).filter(models.TicketType.name == "Instalación AV"))
            ttype = res.scalar_one_or_none()
            
            # Create Parent Ticket
            parent_ticket = await crud_ticket.ticket.create(db, obj_in=TicketCreate(
                title=f"Instalación Multi-Equipo: {submission_data.get('division', 'General')}",
                description=f"Formulario enviado por {current_user.username}",
                ticket_type_id=ttype.id if ttype else None,
                group_id=current_user.group_id,
                priority="medium",
                template_id=form_id,
                expediente_id=expediente_obj.id if expediente_obj else None
            ), created_by_id=current_user.id)
            
            submission.created_ticket_id = parent_ticket.id
            
            for dev in devices:
                # Create Asset (formerly Endpoint, updating to Asset model)
                from app.crud import crud_asset
                from app.schemas.asset import AssetCreate
                new_asset = await crud_asset.asset.create(db, obj_in=AssetCreate(
                    hostname=dev.get("hostname"),
                    ip_address=dev.get("ip"),
                    mac_address=dev.get("mac"),
                    owner_group_id=current_user.group_id,
                    av_product=dev.get("product"),
                    observations=dev.get("observations")
                ))
                
                # Vincular expediente al asset
                if expediente_obj:
                    new_asset.expedientes.append(expediente_obj)
                
                # Create Sub-ticket
                await crud_ticket.ticket.create(db, obj_in=TicketCreate(
                    title=f"Instalación en {dev.get('hostname')}",
                    description=f"Detalle de instalación individual.",
                    ticket_type_id=ttype.id if ttype else None,
                    group_id=current_user.group_id,
                    parent_ticket_id=parent_ticket.id,
                    priority="low",
                    template_id=form_id,
                    asset_id=new_asset.id,
                    expediente_id=expediente_obj.id if expediente_obj else None
                ), created_by_id=current_user.id)
            
            await db.commit()

            from app.services.notification_service import notification_service
            await notification_service.notify_user(
                db, user_id=current_user.id,
                title="🖥️ Instalación Iniciada",
                message=f"Se han generado {len(devices)} sub-tickets para la instalación solicitada.",
                link=f"/tickets/{parent_ticket.id}"
            )

    return submission

@router.post(
    "/{form_id}/clone",
    response_model=Form,
    dependencies=[Depends(require_role(['owner', 'admin', 'Administrator']))]
)
async def clone_form(
    form_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[models.User, Depends(require_permission("forms:create"))],
):
    cloned = await crud_form.form.clone(db, form_id=form_id, created_by_id=current_user.id)
    if not cloned:
        raise HTTPException(status_code=404, detail="Form not found")
    return cloned

@router.patch(
    "/{form_id}",
    response_model=Form,
    dependencies=[Depends(require_role(['owner', 'admin', 'Administrator']))]
)
async def update_form(
    form_id: UUID,
    form_in: FormUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[models.User, Depends(require_permission("forms:update"))],
):
    form_db = await crud_form.form.get(db, id=form_id)
    if not form_db:
        raise HTTPException(status_code=404, detail="Form not found")
    
    # Production Protection Logic
    if form_db.is_production and form_db.is_active:
        # If user is trying to update structure (fields_schema)
        if form_in.fields_schema is not None:
             # Prevent update if still active
             if form_in.is_active is not False:
                 raise HTTPException(
                     status_code=400, 
                     detail="Production forms cannot be edited while active. Disable it first."
                 )
        
        # If user is trying to deactivate
        if form_in.is_active is False:
            # Check if there's another active form in the same category
            if form_db.category:
                res = await db.execute(
                    select(models.Form)
                    .filter(
                        models.Form.category == form_db.category,
                        models.Form.is_active == True,
                        models.Form.id != form_id
                    )
                )
                others = res.scalars().all()
                if not others:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Cannot disable the only active production form for '{form_db.category}'. Create/activate another one first."
                    )

    return await crud_form.form.update(db, db_obj=form_db, obj_in=form_in)

@router.post(
    "/{form_id}/publish",
    response_model=Form,
    dependencies=[Depends(require_role(['owner', 'admin', 'Administrator']))]
)
async def publish_form(
    form_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[models.User, Depends(require_permission("forms:update"))],
):
    """
    Publish a draft form to production.
    """
    draft_form = await crud_form.form.get(db, id=form_id)
    if not draft_form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    if draft_form.is_production:
        raise HTTPException(status_code=400, detail="Form is already in production")

    # 1. Find previous production form in the same category
    if draft_form.category:
        res = await db.execute(
            select(models.Form)
            .filter(
                models.Form.category == draft_form.category,
                models.Form.is_production == True
            )
        )
        prev_prod = res.scalars().first()
        if prev_prod:
            prev_prod.is_production = False
            prev_prod.is_active = False
            db.add(prev_prod)

    # 2. Promote draft to production
    draft_form.is_production = True
    draft_form.is_active = True
    draft_form.version = (draft_form.version or 0) + 1
    db.add(draft_form)
    
    await db.commit()
    await db.refresh(draft_form)
    return draft_form

@router.delete(
    "/{form_id}",
    dependencies=[Depends(require_role(['owner', 'admin', 'Administrator']))]
)
async def delete_form(
    form_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[models.User, Depends(require_permission("forms:delete"))],
):
    form_db = await crud_form.form.get(db, id=form_id)
    if not form_db:
        raise HTTPException(status_code=404, detail="Form not found")
    
    if form_db.is_production:
        raise HTTPException(status_code=400, detail="Production forms cannot be deleted.")
        
    form_db.deleted_at = func.now()
    await db.commit()
    return {"message": "Form deleted"}
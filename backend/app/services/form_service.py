from sqlalchemy.orm import Session
from app.db.models.form import Form, FormSubmission
from app.db.models.ticket import Ticket, TicketType
from app.db.models.endpoint import Endpoint
from app.crud.crud_endpoint import endpoint as crud_endpoint
from app.crud.crud_ticket import ticket as crud_ticket
from typing import Dict, Any, List
import uuid

class FormAutomationService:
    @staticmethod
    async def process_submission(db: Session, form_id: uuid.UUID, submission_data: Dict[str, Any], user_id: uuid.UUID, group_id: uuid.UUID):
        """
        Procesa un formulario y ejecuta reglas de automatización.
        Soporta 'multi-equipo' si la data contiene una lista de equipos.
        """
        form = db.query(Form).filter(Form.id == form_id).first()
        if not form:
            return None

        # 1. Crear el registro inmutable de la sumisión
        submission = FormSubmission(
            form_id=form_id,
            submitted_by_id=user_id,
            group_id=group_id,
            data=submission_data
        )
        db.add(submission)
        db.flush()

        # 2. Lógica de Instalación Multi-Equipo (Requerimiento Punto 4)
        # Buscamos si el formulario es de tipo 'instalacion' y tiene el array de equipos
        equipos = submission_data.get("equipos", [])
        
        if equipos and isinstance(equipos, list):
            # Obtener tipo de ticket para instalación
            t_type = db.query(TicketType).filter(TicketType.name == "Instalación").first()
            
            # Crear Ticket Padre
            parent_ticket = Ticket(
                title=f"Instalación Masiva: {form.name}",
                description=f"Solicitud generada vía formulario: {form.name}. Total equipos: {len(equipos)}",
                status="open",
                priority="medium",
                ticket_type_id=t_type.id if t_type else None,
                group_id=group_id,
                created_by_id=user_id
            )
            db.add(parent_ticket)
            db.flush()
            
            submission.created_ticket_id = parent_ticket.id

            for eq in equipos:
                # 2.1 Crear Endpoint en Inventario
                new_ep = Endpoint(
                    hostname=eq.get("hostname"),
                    ip=eq.get("ip"),
                    mac=eq.get("mac"),
                    product=eq.get("producto", "Desconocido"),
                    status="pending_installation",
                    group_id=group_id,
                    extra_data={"from_form": str(form.id)}
                )
                db.add(new_ep)
                db.flush()

                # 2.2 Crear Sub-ticket por equipo
                sub_ticket = Ticket(
                    title=f"Instalación: {new_ep.hostname}",
                    description=f"Instalar agente en {new_ep.hostname} ({new_ep.ip})",
                    status="open",
                    priority="medium",
                    ticket_type_id=t_type.id if t_type else None,
                    group_id=group_id,
                    created_by_id=user_id,
                    parent_ticket_id=parent_ticket.id
                )
                db.add(sub_ticket)
                
                # Vincular endpoint al sub-ticket
                from app.db.models.ticket import ticket_endpoints
                db.execute(ticket_endpoints.insert().values(ticket_id=sub_ticket.id, endpoint_id=new_ep.id))

        db.commit()
        return submission

form_automation_service = FormAutomationService()

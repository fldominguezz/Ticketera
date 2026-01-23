from sqlalchemy.orm import Session
from app.db.models.ticket import Ticket, TicketType
from app.db.models.endpoint import Endpoint
from app.db.models.audit_log import AuditLog
from app.crud.crud_endpoint import endpoint as crud_endpoint
from app.crud.crud_ticket import ticket as crud_ticket
from typing import Dict, Any, Optional
import uuid

class SIEMService:
    @staticmethod
    def process_event(db: Session, event_data: Dict[str, Any], group_id: uuid.UUID):
        """
        Process an incoming SIEM event.
        1. Normalize data.
        2. Correlate with existing endpoint.
        3. Create ticket if necessary.
        """
        # 1. Normalización (Asumiendo formato FortiSIEM)
        ip = event_data.get("ip") or event_data.get("src_ip")
        hostname = event_data.get("hostname")
        event_type = event_data.get("event_type", "Security Alert")
        severity = event_data.get("severity", "medium").lower()
        
        # 2. Correlación de Endpoint
        endpoint = None
        if ip:
            endpoint = db.query(Endpoint).filter(Endpoint.ip == ip).first()
        elif hostname:
            endpoint = db.query(Endpoint).filter(Endpoint.hostname == hostname).first()

        # Si no existe, podríamos crearlo como 'Desconocido' o marcar la alerta
        
        # 3. Determinar tipo de ticket
        ticket_type = db.query(TicketType).filter(TicketType.name == "Alerta SIEM").first()
        if not ticket_type:
            # Fallback a incidente
            ticket_type = db.query(TicketType).filter(TicketType.name == "Incidente").first()

        # 4. Crear Ticket Automático
        new_ticket = Ticket(
            title=f"SIEM: {event_type} en {hostname or ip or 'Desconocido'}",
            description=f"Alerta detectada por FortiSIEM.\nDetalles: {event_data.get('details', 'Sin detalles')}",
            status="open",
            priority=severity if severity in ["low", "medium", "high", "critical"] else "medium",
            ticket_type_id=ticket_type.id,
            group_id=group_id,
            created_by_id=uuid.UUID("00000000-0000-0000-0000-000000000000"), # System User ID
            extra_data={"siem_raw": event_data}
        )
        
        db.add(new_ticket)
        db.flush() # Para obtener el ID

        if endpoint:
            # Vincular endpoint al ticket
            from app.db.models.ticket import ticket_endpoints
            db.execute(ticket_endpoints.insert().values(ticket_id=new_ticket.id, endpoint_id=endpoint.id))

        db.commit()
        db.refresh(new_ticket)
        
        return new_ticket

siem_service = SIEMService()

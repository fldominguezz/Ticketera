from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.ticket import Ticket, TicketType
from app.db.models.endpoint import Endpoint
from app.db.models.audit_log import AuditLog
from app.crud.crud_endpoint import endpoint as crud_endpoint
from app.crud.crud_ticket import ticket as crud_ticket
from typing import Dict, Any, Optional
import uuid
import logging
import xml.etree.ElementTree as ET
import re
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class SIEMService:
    def _parse_fortisiem_xml(self, xml_string: str):
        try:
            # Extract raw_log_content using regex to avoid XML parsing issues with nested non-XML
            raw_log_content = ""
            raw_events_match = re.search(r"<rawEvents>(.*?)</rawEvents>", xml_string, re.DOTALL)
            if raw_events_match:
                raw_log_content = raw_events_match.group(1).strip()
                xml_string_for_parsing = re.sub(r"<rawEvents>.*?</rawEvents>", "", xml_string, flags=re.DOTALL)
            else:
                xml_string_for_parsing = xml_string

            root = ET.fromstring(xml_string_for_parsing)
            incident_id = root.get("incidentId", "N/A")
            severity = root.get("severity", "5")
            rule_name = root.findtext("name", "N/A")
            description = root.findtext("description", "No description provided.")
            
            source_ip = "N/A"
            incident_target = root.find("incidentTarget")
            if incident_target is not None:
                for entry in incident_target.findall("entry"):
                    if entry.get("name") == "Host IP":
                        source_ip = entry.text

            return {
                "incident_id": incident_id,
                "severity_num": severity,
                "rule_name": rule_name,
                "source_ip": source_ip,
                "description": description,
                "raw_log": raw_log_content
            }
        except Exception as e:
            logger.error(f"Error parsing FortiSIEM XML: {e}")
            return None

    def _map_severity(self, severity_num: str) -> str:
        try:
            s = int(severity_num)
            if s >= 8: return "critical"
            if s >= 6: return "high"
            if s >= 4: return "medium"
            return "low"
        except:
            return "medium"

    async def process_event(self, db: AsyncSession, raw_data: Any, group_id: uuid.UUID):
        """
        Procesa eventos de FortiSIEM (XML o JSON) con soporte para idempotencia.
        """
        event_info = {}
        incident_id = None
        
        if isinstance(raw_data, str) and raw_data.strip().startswith("<"):
            parsed = self._parse_fortisiem_xml(raw_data)
            if parsed:
                incident_id = parsed["incident_id"]
                event_info = {
                    "ip": parsed["source_ip"],
                    "event_type": parsed["rule_name"],
                    "severity": self._map_severity(parsed["severity_num"]),
                    "details": parsed["description"],
                    "raw_log": parsed["raw_log"],
                    "incident_id": incident_id
                }
        elif isinstance(raw_data, dict):
            incident_id = raw_data.get("incidentId") or str(raw_data.get("id", ""))
            event_info = {
                "ip": raw_data.get("ip") or raw_data.get("src_ip"),
                "hostname": raw_data.get("hostname"),
                "event_type": raw_data.get("event_type", "Security Alert"),
                "severity": raw_data.get("severity", "medium").lower(),
                "details": raw_data.get("details", "Sin detalles"),
                "raw_log": str(raw_data),
                "incident_id": incident_id
            }
        
        if not event_info:
            logger.warning("Could not parse SIEM event data")
            return None

        # --- Lógica de Idempotencia ---
        if incident_id and incident_id != "N/A":
            # Buscar si ya existe un ticket con este incidentId en extra_data
            # Usamos una sintaxis compatible con SQLAlchemy 2.0 para JSONB
            query = select(Ticket).filter(
                Ticket.extra_data["incident_id"].as_string() == str(incident_id)
            )
            result = await db.execute(query)
            existing_ticket = result.scalars().first()
            
            if existing_ticket:
                logger.info(f"Actualizando ticket existente para incidentId: {incident_id}")
                existing_ticket.description = f"ACTUALIZADO: {event_info['details']}\n\n{existing_ticket.description}"
                existing_ticket.priority = event_info['severity']
                existing_ticket.updated_at = datetime.now(timezone.utc)
                await db.commit()
                await db.refresh(existing_ticket)
                return existing_ticket

        # Correlation with assets
        ip = event_info.get("ip")
        endpoint_id = None
        if ip and ip != "N/A":
            res_ep = await db.execute(select(Endpoint).filter(Endpoint.ip_address == ip))
            ep_obj = res_ep.scalars().first()
            if ep_obj:
                endpoint_id = ep_obj.id

        # Get Ticket Type
        res_tt = await db.execute(select(TicketType).filter(TicketType.name == "Alerta FortiSIEM"))
        ticket_type = res_tt.scalars().first()
        if not ticket_type:
            res_tt = await db.execute(select(TicketType).filter(TicketType.name == "Incidente SOC"))
            ticket_type = res_tt.scalars().first()

        new_ticket = Ticket(
            title=f"SIEM: {event_info['event_type']}",
            description=f"{event_info['details']}\n\nIP Origen: {ip or 'N/A'}",
            status="open",
            priority=event_info['severity'],
            ticket_type_id=ticket_type.id if ticket_type else None,
            group_id=group_id,
            asset_id=endpoint_id,
            created_by_id=uuid.UUID("852d2452-e98a-48eb-9d41-9281e03f1cf0"), # fortisiem user
            extra_data={"siem_raw": raw_data, "incident_id": incident_id}
        )
        
        db.add(new_ticket)
        await db.commit()
        await db.refresh(new_ticket)
        return new_ticket

siem_service = SIEMService()

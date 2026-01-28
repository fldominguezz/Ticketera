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
    def _parse_kv_string(self, text: str) -> Dict[str, str]:
        """
        Parses generic syslog/Fortinet key=value or key="value" strings.
        """
        pattern = r'(\w+)=(?:\"([^\"]*)\"|(\S+))'
        matches = re.findall(pattern, text)
        return {m[0]: (m[1] if m[1] else m[2]) for m in matches}

    def _parse_fortisiem_xml(self, xml_string: str):
        try:
            root = ET.fromstring(xml_string)
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

            # Extract raw_log_content after main XML parsing
            raw_log_element = root.find("rawEvents")
            raw_log_content = raw_log_element.text.strip() if raw_log_element is not None and raw_log_element.text else ""

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

    def _calculate_final_severity(self, siem_sev: str, asset_crit: str = "medium") -> str:
        # Simple matrix logic
        sev_map = {"low": 1, "medium": 2, "high": 3, "critical": 4}
        crit_map = {"low": 1, "medium": 2, "high": 3, "critical": 4}
        
        s_val = sev_map.get(siem_sev.lower(), 2)
        c_val = crit_map.get(asset_crit.lower(), 2)
        
        score = s_val + (c_val - 2) # Adjust based on asset
        if score >= 4: return "CRITICAL"
        if score == 3: return "HIGH"
        if score == 2: return "MEDIUM"
        return "LOW"

    async def process_event(self, db: AsyncSession, raw_data: Any, group_id: uuid.UUID):
        from app.db.models.asset import Asset
        event_info = {}
        incident_id = None
        raw_event_text = str(raw_data)
        parsed_kv = {}
        
        if isinstance(raw_data, str) and raw_data.strip().startswith("<"):
            parsed = self._parse_fortisiem_xml(raw_data)
            if parsed:
                incident_id = parsed["incident_id"]
                raw_event_text = parsed["raw_log"] or raw_data
                parsed_kv = self._parse_kv_string(raw_event_text)
                event_info = {
                    "ip": parsed["source_ip"],
                    "event_type": parsed["rule_name"],
                    "severity": self._map_severity(parsed["severity_num"]),
                    "details": parsed["description"],
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
                "incident_id": incident_id
            }
            parsed_kv = raw_data
        
        if not event_info:
            return None

        # Idempotencia
        if incident_id and incident_id != "N/A":
            query = select(Ticket).filter(Ticket.extra_data["incident_id"].as_string() == str(incident_id))
            result = await db.execute(query)
            existing = result.scalars().first()
            if existing:
                existing.description = f"ACTUALIZADO: {event_info['details']}\n\n{existing.description}"
                await db.commit()
                return existing

        # Enrichment
        ip = event_info.get("ip")
        asset_id = None
        asset_criticality = "medium"
        enrichment_data = {}
        
        if ip and ip != "N/A":
            res_ast = await db.execute(select(Asset).filter(Asset.ip_address == ip))
            asset_obj = res_ast.scalars().first()
            if asset_obj:
                asset_id = asset_obj.id
                asset_criticality = asset_obj.criticality or "medium"
                enrichment_data["asset_context"] = {
                    "hostname": asset_obj.hostname,
                    "os": asset_obj.os_name,
                    "location": "N/A" # Resolved later if needed
                }

        final_sev = self._calculate_final_severity(event_info["severity"], asset_criticality)

        # Get Ticket Type
        res_tt = await db.execute(select(TicketType).filter(TicketType.name.in_(["Alerta SIEM", "FortiSIEM", "Incidente SOC"])))
        ticket_type = res_tt.scalars().first()

        new_alert = Ticket(
            title=f"ALERTA: {event_info['event_type']}",
            description=event_info['details'],
            status="open",
            priority=event_info['severity'],
            ticket_type_id=ticket_type.id if ticket_type else None,
            group_id=group_id,
            asset_id=asset_id,
            created_by_id=uuid.UUID("1aec092c-51c1-4475-b652-f52093ec188c"),
            extra_data={"incident_id": incident_id},
            raw_event=raw_event_text,
            parsed_event=parsed_kv,
            enrichment=enrichment_data,
            final_severity=final_sev,
            siem_metadata={
                "rule": event_info['event_type'],
                "original_severity": event_info['severity'],
                "incident_id": incident_id
            },
            remediation_suggestions=[
                "Investigar actividad anómala en el host de origen.",
                "Verificar integridad de logs en el dispositivo.",
                "Aplicar políticas de aislamiento si el evento es persistente."
            ]
        )
        
        db.add(new_alert)
        await db.commit()
        await db.refresh(new_alert)
        return new_alert

siem_service = SIEMService()

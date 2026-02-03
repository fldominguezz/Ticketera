from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.ticket import Ticket, TicketType
from app.db.models.alert import Alert
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
            description = root.findtext("description")
            
            if description is None:
                # Si no hay etiqueta description, usamos el texto del root si existe o un fragmento del XML
                description = root.text or f"Contenido XML: {xml_string[:100]}"

            source_ip = "N/A"
            incident_target = root.find("incidentTarget")
            if incident_target is not None:
                for entry in incident_target.findall("entry"):
                    if entry.get("name") == "Host IP":
                        source_ip = entry.text

            # Extract raw_log_content after main XML parsing
            raw_log_element = root.find("rawEvents")
            raw_log_content = raw_log_element.text.strip() if raw_log_element is not None and raw_log_element.text else xml_string

            return {
                "incident_id": incident_id,
                "severity_num": severity,
                "rule_name": rule_name,
                "source_ip": source_ip,
                "description": description,
                "raw_log": raw_log_content
            }
        except Exception as e:
            logger.warning(f"Non-standard XML format received: {e}")
            return {
                "incident_id": "N/A",
                "severity_num": "5",
                "rule_name": "N/A",
                "source_ip": "N/A",
                "description": f"Evento de Test/No estándar: {xml_string[:200]}",
                "raw_log": xml_string
            }

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

    def _map_severity(self, siem_sev: str) -> str:
        try:
            val = int(siem_sev)
            if val >= 8: return "critical"
            if val >= 6: return "high"
            if val >= 4: return "medium"
            return "low"
        except:
            return "medium"

    async def process_event(self, db: AsyncSession, raw_data: Any, root_group_id: uuid.UUID, created_by_id: uuid.UUID, ticket_type_id: Optional[uuid.UUID] = None):
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

        # Idempotencia desactivada temporalmente para diagnóstico: Siempre crear nueva fila
        """
        if incident_id and incident_id != "N/A":
            query = select(Alert).filter(Alert.external_id == str(incident_id))
            result = await db.execute(query)
            existing = result.scalars().first()
            if existing:
                existing.description = f"ACTUALIZADO: {event_info['details']}\n\n{existing.description}"
                await db.commit()
                return existing
        """

        # Crear ALERTA (No Ticket)
        new_alert = Alert(
            external_id=incident_id if incident_id != "N/A" else None,
            rule_name=event_info['event_type'],
            description=event_info['details'],
            severity=event_info['severity'],
            source_ip=event_info.get("ip"),
            raw_log=raw_event_text,
            extra_data={
                "parsed_kv": parsed_kv,
                "original_severity": event_info['severity']
            },
            status="new"
        )
        
        db.add(new_alert)
        await db.commit()
        await db.refresh(new_alert)

        # Notificación en tiempo real (Apuntando a /soc/events)
        from app.services.notification_service import notification_service
        from app.db.models.user import User
        # Notificar a usuarios con permiso de SOC
        res_users = await db.execute(select(User).filter(User.is_superuser == True)) # Simplificado para test
        users = res_users.scalars().all()
        for u in users:
            await notification_service.notify_user(
                db, user_id=u.id,
                title=f"🚨 EVENTO SIEM: {event_info['severity'].upper()}",
                message=f"Regla: {event_info['event_type']}",
                link=f"/soc/events"
            )

        return new_alert

siem_service = SIEMService()

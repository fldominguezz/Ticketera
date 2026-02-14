from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.ticket import Ticket, TicketType
from app.db.models.alert import Alert
from app.db.models.endpoint import Endpoint
from app.db.models.audit_log import AuditLog
from app.crud.crud_endpoint import endpoint as crud_endpoint
from app.crud.crud_ticket import ticket as crud_ticket
from typing import Dict, Any, Optional, List
import uuid
import logging
import defusedxml.ElementTree as ET
import re
import asyncio
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class SIEMService:
    def __init__(self):
        self._analysis_lock = asyncio.Lock() # Bloqueo para procesar 1x1 (obsoleto por semáforo)
        self._ai_semaphore = asyncio.Semaphore(2) # MÁXIMO 2 ANÁLISIS DE IA SIMULTÁNEOS

    def _parse_kv_string(self, text: str) -> Dict[str, str]:
        """
        Parses generic syslog/Fortinet key=value or key="value" strings.
        """
        pattern = r'(\w+)=(?:\"([^\"]*)\"|(\S+))'
        matches = re.findall(pattern, text)
        return {m[0]: (m[1] if m[1] else m[2]) for m in matches}

    def _parse_fortisiem_xml(self, xml_string: str):
        try:
            # SANITIZACIÓN: Eliminar caracteres binarios o de control que rompen el parser
            sanitized_xml = re.sub(r'[^\x09\x0A\x0D\x20-\x7E\x80-\xFF]', '', xml_string)
            
            try:
                root = ET.fromstring(sanitized_xml)
                incident_id = root.get("incidentId", "N/A")
                severity = root.get("severity", "5")
                rule_name = root.findtext("name", "N/A")
                description = root.findtext("description")
                
                raw_log_element = root.find("rawEvents")
                raw_log_content = raw_log_element.text.strip() if raw_log_element is not None and raw_log_element.text else xml_string

                # Extraer Metadatos Técnicos Adicionales
                mitre_tactic = root.findtext("mitreTactic", "N/A")
                mitre_tech = root.findtext("mitreTechniqueId", "N/A")
                
                source_ip = "N/A"
                dest_ip = "N/A"
                
                incident_src = root.find("incidentSource")
                if incident_src is not None:
                    for entry in incident_src.findall("entry"):
                        if entry.get("name") == "Source IP" or entry.get("attribute") == "srcIpAddr":
                            source_ip = entry.text

                incident_target = root.find("incidentTarget")
                if incident_target is not None:
                    for entry in incident_target.findall("entry"):
                        if entry.get("name") == "Destination IP" or entry.get("attribute") == "destIpAddr":
                            dest_ip = entry.text

                return {
                    "incident_id": incident_id,
                    "severity_num": severity,
                    "rule_name": rule_name,
                    "source_ip": source_ip,
                    "dest_ip": dest_ip,
                    "mitre_tactic": mitre_tactic,
                    "mitre_tech": mitre_tech,
                    "description": description or "Sin descripción",
                    "raw_log": raw_log_content
                }
            except Exception as e:
                logger.warning(f"Fallo parser XML, usando Regex fallback: {e}")
                
                # Regex Fallback
                rule_name = "N/A"
                description = "Error en formato de evento"
                incident_id = "N/A"
                severity = "5"
                mitre_tactic = "N/A"

                name_match = re.search(r'<name>(.*?)</name>', xml_string, re.DOTALL)
                if name_match: rule_name = name_match.group(1).strip()
    pass
                desc_match = re.search(r'<description>(.*?)</description>', xml_string, re.DOTALL)
                if desc_match: description = desc_match.group(1).strip()
    pass
                mitre_match = re.search(r'<mitreTactic>(.*?)</mitreTactic>', xml_string)
                if mitre_match: mitre_tactic = mitre_match.group(1)
    pass
                inc_match = re.search(r'incidentId="(.*?)"', xml_string)
                if inc_match: incident_id = inc_match.group(1)
    pass
                # Fallback Regex IP
                source_ip = "N/A"
                ip_match = re.search(r'src="?([\d\.]+)"?|srcip="?([\d\.]+)"?', xml_string)
                if ip_match:
                    source_ip = ip_match.group(1) or ip_match.group(2)

                return {
                    "incident_id": incident_id,
                    "severity_num": "5",
                    "rule_name": rule_name,
                    "source_ip": source_ip,
                    "dest_ip": "N/A",
                    "mitre_tactic": mitre_tactic,
                    "mitre_tech": "N/A",
                    "description": description,
                    "raw_log": xml_string
                }
        except Exception as e:
            logger.error(f"Error crítico en parser: {e}")
            return None

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
                
                # REFUERZO: Si el XML no traía IP, buscar en el raw_log parseado
                source_ip = parsed["source_ip"]
                if source_ip == "N/A":
                    source_ip = parsed_kv.get("src") or parsed_kv.get("srcip") or parsed_kv.get("source_ip") or "N/A"

                dest_ip = parsed["dest_ip"]
                if dest_ip == "N/A":
                    dest_ip = parsed_kv.get("dst") or parsed_kv.get("dstip") or parsed_kv.get("destination_ip") or "N/A"

                event_info = {
                    "ip": source_ip,
                    "dest_ip": dest_ip,
                    "event_type": parsed["rule_name"],
                    "severity": self._map_severity(parsed["severity_num"]),
                    "details": parsed["description"],
                    "incident_id": incident_id,
                    "mitre": {"tactic": parsed["mitre_tactic"], "tech": parsed["mitre_tech"]}
                }
        elif isinstance(raw_data, dict):
            incident_id = raw_data.get("incidentId") or str(raw_data.get("id", ""))
            event_info = {
                "ip": raw_data.get("ip") or raw_data.get("src_ip"),
                "dest_ip": raw_data.get("dest_ip") or raw_data.get("dst_ip"),
                "event_type": raw_data.get("event_type", "Security Alert"),
                "severity": raw_data.get("severity", "medium").lower(),
                "details": raw_data.get("details", "Sin detalles"),
                "incident_id": incident_id,
                "mitre": raw_data.get("mitre", {"tactic": "N/A", "tech": "N/A"})
            }
            parsed_kv = raw_data
        
        if not event_info:
            return None

        # Crear ALERTA
        new_alert = Alert(
            external_id=incident_id if incident_id != "N/A" else None,
            rule_name=event_info['event_type'],
            description=event_info['details'],
            severity=event_info['severity'],
            source_ip=event_info.get("ip"),
            raw_log=raw_event_text,
            extra_data={
                "parsed_kv": parsed_kv,
                "mitre": event_info.get("mitre", {}),
                "dest_ip": event_info.get("dest_ip"),
                "original_severity": event_info['severity']
            },
            status="new"
        )
        
        db.add(new_alert)
        await db.commit()
        await db.refresh(new_alert)

        # Disparar análisis experto en segundo plano (no bloqueante)
        asyncio.create_task(self.perform_expert_analysis(new_alert.id))

        # Notificaciones inteligentes en segundo plano para no bloquear el retorno
        async def send_notifications():
            from app.services.notification_service import notification_service
            from app.db.session import AsyncSessionLocal
            
            async with AsyncSessionLocal() as background_db:
                if event_info['severity'] in ['critical', 'high']:
                    await notification_service.notify_admins(
                        background_db,
                        title=f"🚨 ALERTA {event_info['severity'].upper()}",
                        message=f"Evento detectado: {event_info['event_type']} en {event_info['ip']}",
                        link=f"/soc/events"
                    )
                else:
                    await notification_service.notify_admins(
                        background_db,
                        title=f"🛡️ Evento SIEM: {event_info['severity'].title()}",
                        message=f"Regla: {event_info['event_type']}",
                        link=f"/soc/events"
                    )
        
        asyncio.create_task(send_notifications())

        return new_alert

    async def perform_expert_analysis(self, alert_id: uuid.UUID):
        """Tarea en segundo plano para procesar la IA.
        Se eliminó el lock para permitir concurrencia ligera gestionada por Ollama.
        """
        from app.db.session import AsyncSessionLocal
        from app.services.expert_analysis_service import expert_analysis_service
        
        async with AsyncSessionLocal() as db:
            try:
                # 1. Obtener la alerta
                res = await db.execute(select(Alert).where(Alert.id == alert_id))
                alert = res.scalar_one_or_none()
                
                if not alert: return
                
                # EVITAR RE-PROCESAR: Si ya tiene resumen, no gastar CPU
                if alert.ai_summary and alert.ai_summary.strip():
                    logger.info(f"Alert {alert_id} already has AI analysis. Skipping.")
                    return

                # 2. Ejecutar análisis (CON SEMÁFORO)
                async with self._ai_semaphore:
                    logger.info(f"Executing AI Analysis for alert {alert_id} (Slot acquired)...")
                    analysis = expert_analysis_service.analyze_raw_log(alert.raw_log or alert.description)
                
                if analysis:
                    # 3. Guardar resultados
                    alert.ai_summary = analysis.get("summary")
                    alert.ai_remediation = analysis.get("remediation")
                    
                    await db.commit()
                    logger.info(f"AI Analysis successfully saved for alert {alert_id}")
            except Exception as e:
                logger.error(f"Background AI Analysis failed for {alert_id}: {e}")

siem_service = SIEMService()
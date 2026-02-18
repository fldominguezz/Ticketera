import logging
import json
import re
import asyncio
import defusedxml.ElementTree as ET
import defusedxml.minidom as safe_minidom
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid
from datetime import datetime

from app.db.models.alert import Alert
from app.core.ws_manager import manager

logger = logging.getLogger(__name__)

class SIEMService:
    def __init__(self):
        pass

    def _pretty_xml(self, xml_str: str) -> str:
        """Formatea un XML para que sea legible."""
        try:
            reparsed = safe_minidom.parseString(xml_str.strip())
            return reparsed.toprettyxml(indent="  ")
        except Exception:
            return xml_str

    def _extract_kv_from_text(self, text: str) -> dict:
        """Extrae pares clave=valor de un texto, manejando comillas."""
        kv = {}
        # Regex para capturar clave="valor" o clave=valor
        pattern = r'(\w+)=("[^"]*"|[^\s]+)'
        matches = re.findall(pattern, text)
        for k, v in matches:
            kv[k] = v.strip('"')
        return kv

    async def _background_ai_analysis(self, alert_id: uuid.UUID, raw_log: str):
        """Tarea en segundo plano para procesar IA sin bloquear el flujo principal."""
        try:
            # Esperar un momento para asegurar que la transacción principal terminó
            await asyncio.sleep(1)
            
            from app.services.expert_analysis_service import expert_analysis_service
            
            # LIMPIEZA: Extraer solo la parte técnica para que la IA no se pierda en el XML
            technical_log = raw_log
            if "<rawEvents>" in raw_log:
                technical_log = raw_log.split("<rawEvents>")[1].split("</rawEvents>")[0].strip()
            
            analysis = expert_analysis_service.analyze_raw_log(technical_log)
            
            # Importar aquí para evitar circular dependency
            from app.db.session import SessionLocal
            async with SessionLocal() as db:
                result = await db.execute(select(Alert).where(Alert.id == alert_id))
                alert = result.scalar_one_or_none()
                if alert:
                    alert.ai_summary = analysis.get("summary")
                    alert.ai_remediation = analysis.get("remediation")
                    await db.commit()
                    logger.info(f"IA: Análisis automático finalizado para alerta {alert_id}")
        except Exception as e:
            logger.error(f"IA: Falló análisis en segundo plano: {e}")

    async def process_fortisiem_xml(self, db: AsyncSession, xml_data: str):
        """
        Parsea XML de FortiSIEM exhaustivamente para extraer todos los atributos.
        """
        try:
            pretty_xml = self._pretty_xml(xml_data)
            root = ET.fromstring(xml_data)
            
            # 1. Datos básicos
            rule_name = root.findtext(".//name") or root.findtext(".//ruleName") or "Alerta SIEM Desconocida"
            description = root.findtext(".//description") or "Sin descripción técnica."
            severity_val = root.get("severity") or root.findtext(".//severity") or "9"
            
            severity_map = {"10": "critical", "9": "critical", "8": "high", "7": "high", "6": "medium", "5": "medium"}
            severity = severity_map.get(str(severity_val), "low")

            # 2. Extracción Atributos
            attributes = {}
            for attr_k, attr_v in root.attrib.items():
                attributes[f"Incident {attr_k.capitalize()}"] = attr_v
            for entry in root.findall(".//entry"):
                name = entry.get("name") or entry.get("attribute")
                if name and entry.text:
                    attributes[name] = entry.text
            for child in root:
                if child.tag not in ["incidentSource", "incidentTarget", "incidentDetails", "rawEvents"] and child.text:
                    attributes[child.tag.capitalize()] = child.text.strip()
            raw_events_text = root.findtext(".//rawEvents")
            if raw_events_text:
                kv_from_raw = self._extract_kv_from_text(raw_events_text)
                for k, v in kv_from_raw.items():
                    if k not in attributes:
                        attributes[k] = v

            source_ip = attributes.get("Source IP") or attributes.get("srcip") or "127.0.0.1"
            target_host = attributes.get("Destination Host Name") or attributes.get("dstip") or "N/A"
            external_id = attributes.get("Incident Incidentid") or str(uuid.uuid4())[:8]

            # 3. Registrar en el modelo Alert
            alert = Alert(
                id=uuid.uuid4(),
                external_id=external_id,
                rule_name=rule_name,
                description=description,
                severity=severity,
                source_ip=source_ip,
                target_host=target_host,
                raw_log=pretty_xml,
                extra_data=attributes,
                status="new",
                created_at=datetime.utcnow()
            )
            
            db.add(alert)
            await db.commit()
            await db.refresh(alert)

            # 4. DISPARAR IA EN SEGUNDO PLANO
            asyncio.create_task(self._background_ai_analysis(alert.id, alert.raw_log))

            # 5. Notificar vía WebSocket
            try:
                await manager.broadcast({
                    "type": "NEW_SIEM_ALERT",
                    "data": {
                        "id": str(alert.id),
                        "rule_name": alert.rule_name,
                        "severity": alert.severity,
                        "source_ip": alert.source_ip,
                        "created_at": alert.created_at.isoformat(),
                        "extra_data": alert.extra_data
                    }
                })
            except Exception as ws_err:
                logger.error(f"Error enviando WS: {ws_err}")

            return alert

        except Exception as e:
            logger.error(f"Error procesando XML de FortiSIEM: {e}")
            await db.rollback()
            raise e

siem_service = SIEMService()

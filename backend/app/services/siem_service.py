import logging
import json
import defusedxml.ElementTree as ET
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

    async def process_fortisiem_xml(self, db: AsyncSession, xml_data: str):
        """
        Parsea XML de FortiSIEM de forma segura y crea una ALERTA.
        """
        try:
            # 1. Parsear XML de forma segura (Mitiga XXE)
            root = ET.fromstring(xml_data)
            
            rule_name = root.findtext(".//ruleName") or "Alerta SIEM Desconocida"
            description = root.findtext(".//description") or "Sin descripción técnica."
            severity = root.findtext(".//severity") or "high"
            source_ip = root.findtext(".//hostIp") or root.findtext(".//srcIp") or "127.0.0.1" # Evita B104
            target_host = root.findtext(".//targetHost") or "N/A"
            external_id = root.findtext(".//incidentId") or str(uuid.uuid4())[:8]
            
            logger.info(f"SIEM Alert Received: {rule_name} de {source_ip}")

            # 2. Registrar en el modelo Alert (lo que lee el router SOC)
            alert = Alert(
                id=uuid.uuid4(),
                external_id=external_id,
                rule_name=rule_name,
                description=description,
                severity=severity.lower() if severity.lower() in ["critical", "high", "medium", "low"] else "high",
                source_ip=source_ip,
                target_host=target_host,
                raw_log=xml_data,
                status="new", # Las alertas entran como 'new'
                created_at=datetime.utcnow()
            )
            
            db.add(alert)
            await db.commit()
            await db.refresh(alert)

            # 3. Notificar al Monitor SOC (WebSockets)
            try:
                await manager.broadcast({
                    "type": "NEW_SIEM_ALERT",
                    "data": {
                        "id": str(alert.id),
                        "rule_name": alert.rule_name,
                        "severity": alert.severity,
                        "source_ip": alert.source_ip,
                        "created_at": alert.created_at.isoformat()
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

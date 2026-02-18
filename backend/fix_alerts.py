
import asyncio
import defusedxml.ElementTree as ET
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
import os
import sys

# Añadir el path de la app para importar modelos
sys.path.append("/root/Ticketera/backend")
from app.db.models.alert import Alert

DATABASE_URL = "postgresql+asyncpg://ticketera_admin:20544d8436c74e6750a7471a387e62d265de10578eb94f2bf6c7f7addcdc38fa@db:5432/ticketera_prod_db"

async def fix_alerts():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(select(Alert).where(Alert.rule_name == "Alerta SIEM Desconocida"))
        alerts = result.scalars().all()
        print(f"Encontradas {len(alerts)} alertas para corregir.")

        for alert in alerts:
            try:
                root = ET.fromstring(alert.raw_log)
                
                # Nueva lógica de parseo
                rule_name = root.findtext(".//name") or root.findtext(".//ruleName") or "Alerta SIEM Desconocida"
                severity_val = root.get("severity") or root.findtext(".//severity") or "9"
                severity_map = {"10": "critical", "9": "critical", "8": "high", "7": "high", "6": "medium", "5": "medium"}
                severity = severity_map.get(str(severity_val), "low")

                source_ip = "127.0.0.1"
                src_entry = root.find(".//incidentSource/entry[@attribute='srcIpAddr']")
                if src_entry is not None:
                    source_ip = src_entry.text
                
                dest_entry = root.find(".//incidentTarget/entry[@attribute='destIpPort']")
                target_host = dest_entry.text if dest_entry is not None else "N/A"

                alert.rule_name = rule_name
                alert.severity = severity
                alert.source_ip = source_ip
                alert.target_host = target_host
                
                print(f" -> Corregida: {rule_name} ({source_ip})")
            except Exception as e:
                print(f" -> Error procesando alerta {alert.id}: {e}")

        await session.commit()
    print("Proceso completado.")

if __name__ == "__main__":
    asyncio.run(fix_alerts())

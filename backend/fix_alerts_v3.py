
import asyncio
import re
import defusedxml.ElementTree as ET
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
import sys
import xml.dom.minidom as minidom

sys.path.append("/root/Ticketera/backend")
from app.db.models.alert import Alert

DATABASE_URL = "postgresql+asyncpg://ticketera_admin:20544d8436c74e6750a7471a387e62d265de10578eb94f2bf6c7f7addcdc38fa@db:5432/ticketera_prod_db"

def extract_kv(text):
    kv = {}
    pattern = r'(\w+)=("[^"]*"|[^\s]+)'
    matches = re.findall(pattern, text)
    for k, v in matches:
        kv[k] = v.strip('"')
    return kv

async def fix_alerts():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(select(Alert))
        alerts = result.scalars().all()
        print(f"Actualizando {len(alerts)} alertas con extracción TOTAL de atributos...")

        for alert in alerts:
            try:
                root = ET.fromstring(alert.raw_log)
                attributes = {}
                
                # Atributos de incident
                for k, v in root.attrib.items():
                    attributes[f"Incident {k.capitalize()}"] = v
                
                # Entries
                for entry in root.findall(".//entry"):
                    name = entry.get("name") or entry.get("attribute")
                    if name and entry.text:
                        attributes[name] = entry.text
                
                # Etiquetas
                for child in root:
                    if child.tag not in ["incidentSource", "incidentTarget", "incidentDetails", "rawEvents"] and child.text:
                        attributes[child.tag.capitalize()] = child.text.strip()
                
                # Raw events
                raw_text = root.findtext(".//rawEvents")
                if raw_text:
                    kv_raw = extract_kv(raw_text)
                    for k, v in kv_raw.items():
                        if k not in attributes:
                            attributes[k] = v

                alert.extra_data = attributes
                print(f" -> Tabla completa para: {alert.rule_name} ({len(attributes)} atributos)")
            except:
                continue

        await session.commit()
    print("¡Listo!")

if __name__ == "__main__":
    asyncio.run(fix_alerts())

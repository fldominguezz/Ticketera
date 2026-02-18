
import asyncio
import defusedxml.ElementTree as ET
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
import sys
import xml.dom.minidom as minidom

sys.path.append("/root/Ticketera/backend")
from app.db.models.alert import Alert

DATABASE_URL = "postgresql+asyncpg://ticketera_admin:20544d8436c74e6750a7471a387e62d265de10578eb94f2bf6c7f7addcdc38fa@db:5432/ticketera_prod_db"

def pretty_xml(xml_str):
    try:
        reparsed = minidom.parseString(xml_str.strip())
        return reparsed.toprettyxml(indent="  ")
    except:
        return xml_str

async def fix_alerts():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(select(Alert))
        alerts = result.scalars().all()
        print(f"Procesando {len(alerts)} alertas para añadir atributos prolijos...")

        for alert in alerts:
            try:
                root = ET.fromstring(alert.raw_log)
                
                # Extraer atributos
                attributes = {}
                for entry in root.findall(".//entry"):
                    attr_name = entry.get("name")
                    if attr_name and entry.text:
                        attributes[attr_name] = entry.text
                
                attributes["Incident ID"] = alert.external_id
                attributes["Organization"] = root.get("organization") or "N/A"
                
                alert.extra_data = attributes
                alert.raw_log = pretty_xml(alert.raw_log)
                print(f" -> Actualizada alerta: {alert.rule_name}")
            except Exception as e:
                print(f" -> Saltando alerta {alert.id} (no es XML de FortiSIEM)")

        await session.commit()
    print("Proceso completado.")

if __name__ == "__main__":
    asyncio.run(fix_alerts())

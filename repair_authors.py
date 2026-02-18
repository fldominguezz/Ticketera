import os
import xml.etree.ElementTree as ET
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import sys

DATABASE_URL = "postgresql+asyncpg://ticketera_admin:20544d8436c74e6750a7471a387e62d265de10578eb94f2bf6c7f7addcdc38fa@db:5432/ticketera_prod_db"
RAW_XML_DIR = "/tmp/migration_raw"

async def repair_ticket_authors():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # 1. Obtener todos los usuarios reales
        res_users = await session.execute(text("SELECT id, username, first_name, last_name FROM users"))
        users = res_users.all()
        
        # 2. Obtener los tickets del admin con legacy_id
        res_tickets = await session.execute(text("""
            SELECT id, extra_data->>'legacy_id' as legacy_id 
            FROM tickets 
            WHERE created_by_id = (SELECT id FROM users WHERE username = 'admin')
            AND extra_data->>'legacy_id' IS NOT NULL
        """))
        tickets_to_fix = res_tickets.all()
        
        updated_count = 0
        for t_id, legacy_id in tickets_to_fix:
            xml_path = os.path.join(RAW_XML_DIR, f"ticket_{legacy_id}_details.xml")
            if not os.path.exists(xml_path): continue

            try:
                tree = ET.parse(xml_path)
                root = tree.getroot()
                
                real_creator_name = None
                for param in root.findall(".//parameter"):
                    name_elem = param.find("name")
                    if name_elem is not None and name_elem.text == "createdby":
                        real_creator_name = param.find("value").text
                        break
                
                if not real_creator_name: continue
                
                clean_xml_name = real_creator_name.strip().upper()
                target_user_id = None

                for u_id, u_username, u_fn, u_ln in users:
                    fn = (u_fn or "").strip().upper()
                    ln = (u_ln or "").strip().upper()
                    uname = u_username.strip().upper()
                    
                    if (fn and ln and fn in clean_xml_name and ln in clean_xml_name) or (uname in clean_xml_name):
                        target_user_id = u_id
                        break

                if target_user_id:
                    await session.execute(
                        text("UPDATE tickets SET created_by_id = :u_id WHERE id = :t_id"),
                        {"u_id": target_user_id, "t_id": t_id}
                    )
                    updated_count += 1

            except Exception as e:
                pass

        await session.commit()
        print(f"Re-asignación completada. Actualizados: {updated_count}")

if __name__ == "__main__":
    asyncio.run(repair_ticket_authors())

import os, sys, uuid, asyncio, defusedxml.ElementTree as ET
sys.path.append("/app")
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.db.models.ticket import Ticket
from app.db.models.group import Group
from app.core.security import get_password_hash
from sqlalchemy import select

def get_uname(name):
    if not name or name.strip() in ["", ".", "null", "NULL"]: return None
    p = name.strip().lower().split()
    if len(p) >= 2: return f"{p[0][0]}{p[-1]}"
    return p[0]

async def run():
    async with AsyncSessionLocal() as db:
        # Obtener un grupo por defecto
        res_g = await db.execute(select(Group).filter(Group.name.ilike("%SOC%")))
        soc_group = res_g.scalar_one_or_none()
        if not soc_group:
            res_g = await db.execute(select(Group).limit(1))
            soc_group = res_g.scalar_one()
        
        group_id = soc_group.id
        print(f"🏢 Usando grupo por defecto: {soc_group.name} ({group_id})")

        xml_dir = "/app/migration_data"
        user_cache = {}
        
        files = [f for f in os.listdir(xml_dir) if f.endswith(".xml")]
        print(f"🚀 Procesando {len(files)} archivos...")

        for f in files:
            try:
                tree = ET.parse(os.path.join(xml_dir, f))
                details = {p.find("name").text: p.find("value").text for p in tree.findall(".//parameter")}
                subject = details.get("subject")
                if not subject: continue

                res_t = await db.execute(select(Ticket).filter(Ticket.title == subject))
                ticket = res_t.scalar_one_or_none()
                if not ticket: continue

                for field in ["createdby", "technician"]:
                    full_name = details.get(field)
                    uname = get_uname(full_name)
                    if not uname: continue

                    if uname not in user_cache:
                        res_u = await db.execute(select(User).filter(User.username == uname))
                        user = res_u.scalar_one_or_none()
                        if not user:
                            p = full_name.split()
                            user = User(
                                id=uuid.uuid4(), username=uname, email=f"{uname}@pfa.gob.ar",
                                first_name=p[0], last_name=p[-1] if len(p)>1 else "",
                                hashed_password=get_password_hash("pfa12345"),
                                is_active=True, force_password_change=True,
                                group_id=group_id
                            )
                            db.add(user); await db.flush()
                            print(f"👤 Creado: {uname} ({full_name})")
                        user_cache[uname] = user.id
                    
                    if field == "createdby": ticket.created_by_id = user_cache[uname]
                    else: ticket.assigned_to_id = user_cache[uname]
                
            except Exception as e: continue # nosec
        
        await db.commit()
        print("✨ Vinculación completada.")

if __name__ == "__main__":
    asyncio.run(run())

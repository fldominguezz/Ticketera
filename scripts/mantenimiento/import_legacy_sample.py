import asyncio
import json
import logging
import re
from datetime import datetime, timedelta
from sqlalchemy import select, text
from app.db.session import AsyncSessionLocal
from app.db.models.ticket import Ticket, TicketType, TicketComment
from app.db.models.user import User
from app.db.models.group import Group

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def clean_legacy_html(raw_html):
    if not raw_html:
        return ""
    # Decodificar entidades básicas
    clean = raw_html.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&").replace("&nbsp;", " ")
    # Convertir BR a saltos de línea
    clean = re.sub(r"<(br\s*/?|BR\s*/?)>", "\n", clean)
    # Eliminar DIVs pero mantener su contenido
    clean = re.sub(r"</?div[^>]*>", "\n", clean)
    # Eliminar cualquier otra etiqueta residual
    clean = re.sub(r"<[^>]+>", "", clean)
    # Limpiar múltiples saltos de línea
    clean = re.sub(r"\n\s*\n", "\n\n", clean)
    return clean.strip()

async def import_sample():
    async with AsyncSessionLocal() as db:
        # 1. Limpiar prueba anterior
        await db.execute(text("DELETE FROM ticket_comments WHERE ticket_id IN (SELECT id FROM tickets WHERE extra_data->>'legacy_id' IS NOT NULL)"))
        await db.execute(text("DELETE FROM tickets WHERE extra_data->>'legacy_id' IS NOT NULL"))
        
        # 2. Mapas de referencia
        res_types = await db.execute(select(TicketType))
        types_map = {t.name: t.id for t in res_types.scalars().all()}
        
        res_users = await db.execute(select(User))
        all_users = res_users.scalars().all()
        email_map = {u.email: u.id for u in all_users}
        name_map = {f"{u.first_name} {u.last_name}".strip().upper(): u.id for u in all_users}
        
        res_groups = await db.execute(select(Group))
        groups_map = {g.name: g.id for g in res_groups.scalars().all()}
        target_group_id = groups_map.get("SOC") or list(groups_map.values())[0]

        # 3. Leer todos los tickets
        with open("/tmp/tickets.jsonl", "r") as f:
            for i, line in enumerate(f):
                t_data = json.loads(line)
                
                legacy_creator_name = t_data.get("created_by", "").strip().upper()
                created_by_id = name_map.get(legacy_creator_name)
                legacy_tech_email = t_data["assigned_to"]["email"]
                assigned_to_id = email_map.get(legacy_tech_email)

                if not created_by_id:
                    res_admin = await db.execute(select(User).where(User.is_superuser == True))
                    created_by_id = res_admin.scalars().first().id

                # Limpieza de textos
                clean_desc = clean_legacy_html(t_data["description"])
                clean_res = clean_legacy_html(t_data["resolution"])

                # Lógica de Plataforma extendida por texto
                full_text = (clean_desc + " " + clean_res).upper()
                platform = "General"
                if "AVAST" in full_text: platform = "AVAST"
                elif "EDR" in full_text: platform = "EDR"
                elif "EMS" in full_text: platform = "EMS"
                elif "ESET" in full_text: platform = "ESET"

                cat = t_data.get("service_category", "")
                target_type = "Ticketera Vieja" # Default seguro
                if "ESET" in cat: 
                    target_type = "Soporte Técnico"
                elif any(x in cat for x in ["Fortinet", "EMS", "EDR"]): 
                    target_type = "Soporte Técnico"
                
                t_type_id = types_map.get(target_type) or types_map.get("Soporte") or list(types_map.values())[0]

                try:
                    ts_str = str(t_data["times"]["created_at"])
                    ts = int(ts_str) / 1000
                    created_at = datetime.fromtimestamp(ts)
                except:
                    created_at = datetime.now()

                new_ticket = Ticket(
                    title=t_data["title"],
                    description=clean_desc,
                    status="closed" if t_data["status"] in ["Cerrada", "Resuelta"] else "open",
                    priority=t_data["priority"].lower() if t_data["priority"] else "medium",
                    platform=platform,
                    ticket_type_id=t_type_id,
                    created_by_id=created_by_id,
                    assigned_to_id=assigned_to_id,
                    owner_group_id=target_group_id,
                    created_at=created_at,
                    extra_data={"legacy_id": t_data["legacy_id"]}
                )
                db.add(new_ticket)
                await db.flush()

                if clean_res:
                    res_comment = TicketComment(
                        ticket_id=new_ticket.id,
                        user_id=assigned_to_id or created_by_id,
                        content=f"**RESOLUCIÓN LEGACY:**\n\n{clean_res}",
                        created_at=created_at + timedelta(minutes=5)
                    )
                    db.add(res_comment)

                logger.info(f"Actualizado #{t_data['legacy_id']} con texto limpio.")

        await db.commit()
        logger.info("Muestra de 10 tickets actualizada con éxito.")

if __name__ == "__main__":
    asyncio.run(import_sample())

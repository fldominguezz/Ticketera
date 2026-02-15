import asyncio
import os
import re
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from uuid import UUID
import fitz # PyMuPDF para extracción de texto

# Configuración
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@db:5432/ticketing_dev_db")
UPLOAD_DIR = "/app/uploads"

async def process_pdf_linking():
    from app.db.models.notifications import Attachment
    from app.db.models.asset import Asset
    from app.db.models.ticket import Ticket
    from sqlalchemy.orm import selectinload
    
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # 1. Obtener todos los adjuntos PDF
        res_att = await session.execute(select(Attachment).where(Attachment.filename.ilike("%.pdf"), Attachment.ticket_id.isnot(None)))
        attachments = res_att.scalars().all()
        print(f"Encontrados {len(attachments)} archivos PDF para analizar.")

        # 2. Cargar inventario para cruce rápido
        res_assets = await session.execute(select(Asset))
        all_assets = res_assets.scalars().all()
        print(f"Cargados {len(all_assets)} activos para comparación.")

        linked_count = 0
        for att in attachments:
            file_path = os.path.join(UPLOAD_DIR, att.file_path)
            if not os.path.exists(file_path): continue

            try:
                # Extraer texto del PDF (Sincrónico, está bien aquí)
                doc = fitz.open(file_path)
                text = ""
                for page in doc:
                    text += page.get_text()
                doc.close()

                # Buscar Hostnames, IPs y MACs
                found_hostnames = re.findall(r"\b[A-Z0-9\-]{5,25}\b", text)
                found_ips = re.findall(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b", text)
                found_macs = re.findall(r"([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})", text)
                found_macs = [m[0] for m in found_macs] if found_macs else []

                potential_targets = set([h.upper() for h in found_hostnames] + found_ips)
                
                matches = []
                for asset in all_assets:
                    if (asset.hostname and asset.hostname.upper() in potential_targets) or \
                       (asset.ip_address and asset.ip_address in potential_targets):
                        matches.append(asset)
                    elif asset.mac_address:
                        clean_mac = asset.mac_address.replace("-", ":").upper()
                        if any(clean_mac in m.upper().replace("-", ":") for m in found_macs):
                            matches.append(asset)

                if matches:
                    # Obtener el ticket con CARGA EXPLÍCITA de activos para evitar greenlet error
                    res_t = await session.execute(
                        select(Ticket)
                        .options(selectinload(Ticket.assets))
                        .where(Ticket.id == att.ticket_id)
                    )
                    ticket = res_t.scalar_one_or_none()
                    
                    if ticket:
                        existing_ids = [a.id for a in ticket.assets]
                        added_to_this_ticket = 0
                        for m in matches:
                            if m.id not in existing_ids:
                                ticket.assets.append(m)
                                existing_ids.append(m.id)
                                added_to_this_ticket += 1
                                linked_count += 1
                        
                        if added_to_this_ticket > 0:
                            print(f"Ticket {ticket.id} ({att.filename}): Vinculados {added_to_this_ticket} activos.")
                            session.add(ticket)
                            await session.flush() # Guardar progreso parcial

            except Exception as e:
                print(f"Error procesando {att.filename}: {e}")

        await session.commit()
        print(f"Proceso finalizado. Total de nuevas vinculaciones: {linked_count}")

if __name__ == "__main__":
    asyncio.run(process_pdf_linking())

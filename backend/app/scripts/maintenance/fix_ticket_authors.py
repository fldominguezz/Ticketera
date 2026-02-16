import os
import sys
import uuid
import asyncio
import xml.etree.ElementTree as ET
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

# Añadir path para backend
sys.path.append("/app")

from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.db.models.ticket import Ticket
from app.core.security import get_password_hash

XML_DIR = "/root/archivo_mantenimiento/migration_legacy_backup/raw"

def clean_username(name):
    if not name or name.lower() == 'null': return None
    # Ejemplo: "Carolina Del Carmen SBAGLIA" -> "carolina.sbaglia"
    parts = name.lower().split()
    if len(parts) >= 2:
        return f"{parts[0]}.{parts[-1]}"
    return parts[0]

async def get_or_create_user(db, full_name):
    username = clean_username(full_name)
    if not username: return None
    
    # Buscar si ya existe
    result = await db.execute(select(User).filter(User.username == username))
    user = result.scalar_one_or_none()
    
    if not user:
        # Crear usuario nuevo
        parts = full_name.split()
        first_name = parts[0]
        last_name = parts[-1] if len(parts) > 1 else ""
        
        user = User(
            id=uuid.uuid4(),
            username=username,
            email=f"{username}@pfa.gob.ar",
            hashed_password=get_password_hash("pfa12345"), # Password genérica
            first_name=first_name,
            last_name=last_name,
            is_active=True,
            is_superuser=False,
            force_password_change=True
        )
        db.add(user)
        await db.flush()
        print(f"👤 Usuario creado: {username} ({full_name})")
    
    return user

async def fix_authors():
    print("🚀 Iniciando recuperación de autores de tickets...")
    async with AsyncSessionLocal() as db:
        files = [f for f in os.listdir(XML_DIR) if f.endswith('.xml')]
        print(f"📦 Procesando {len(files)} archivos de respaldo...")

        for filename in files:
            path = os.path.join(XML_DIR, filename)
            try:
                tree = ET.parse(path)
                root = tree.getroot()
                
                # Extraer datos del XML
                details = root.find(".//Details")
                if details is None: continue
                
                data = {}
                for param in details.findall("parameter"):
                    name = param.find("name").text
                    value = param.find("value").text
                    data[name] = value
                
                workorder_id = data.get('workorderid')
                creator_name = data.get('createdby')
                tech_name = data.get('technician')
                
                if not workorder_id: continue

                # Obtener o crear usuarios
                creator = await get_or_create_user(db, creator_name)
                tech = await get_or_create_user(db, tech_name)

                # Actualizar el ticket en la DB (Buscamos por ID de migración si lo guardamos, o por título aproximado)
                # En este sistema, los IDs de los tickets restaurados coinciden con los del backup
                # Pero como no tenemos un mapeo directo de workorderid a UUID en la DB restaurada,
                # vamos a intentar buscar el ticket por el título (subject)
                subject = data.get('subject')
                if subject:
                    # Buscamos el ticket que coincida con el título
                    res_t = await db.execute(select(Ticket).filter(Ticket.title == subject))
                    ticket = res_t.scalar_one_or_none()
                    
                    if ticket:
                        if creator:
                            ticket.created_by_id = creator.id
                        if tech:
                            ticket.assigned_to_id = tech.id
                        print(f"✅ Ticket #{workorder_id} vinculado a {creator.username if creator else 'N/A'}")

            except Exception as e:
                print(f"❌ Error en {filename}: {e}")

        await db.commit()
        print("✨ Proceso de vinculación finalizado.")

if __name__ == "__main__":
    # Como el script lee archivos del host, lo ejecutaré desde el host apuntando al socket de la DB del contenedor
    # o mejor, montaré la carpeta de mantenimiento en el contenedor temporalmente.
    asyncio.run(fix_authors())

import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import os

# Database connection using container host
SQLALCHEMY_DATABASE_URL = "postgresql+asyncpg://user:password@db:5432/ticketera_db"

async def init_forms():
    engine = create_async_engine(SQLALCHEMY_DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    admin_user_id = "bdfa4b2e-c069-465c-866d-2a6305a4651d"
    admin_group_id = "be6b1648-4866-47a7-8dbe-261817c0ea63"

    ticket_fields = [
        {"name": "title", "label": "Asunto / Título", "type": "text", "required": True},
        {"name": "platform", "label": "Plataforma", "type": "select", "options": ["Forti-EMS", "ESET CLOUD", "ESET BIENESTAR", "Forti-SIEM", "Forti-ANALYZER", "GDE", "INTERNO"], "required": True},
        {"name": "priority", "label": "Prioridad", "type": "select", "options": ["low", "medium", "high", "critical"], "required": True},
        {"name": "description", "label": "Descripción", "type": "textarea", "required": True}
    ]

    asset_fields = [
        {"name": "hostname", "label": "Hostname", "type": "text", "required": True},
        {"name": "ip_address", "label": "Dirección IP", "type": "text", "required": False},
        {"name": "mac_address", "label": "Dirección MAC", "type": "text", "required": False},
        {"name": "product", "label": "Producto / Modelo", "type": "text", "required": False}
    ]

    async with async_session() as session:
        try:
            # Check if they exist
            res = await session.execute(text("SELECT count(*) FROM forms WHERE category IN ('ticket_creation', 'asset_inventory')"))
            count = res.scalar()
            
            if count == 0:
                print("Creating production templates...")
                
                # Ticket Creation Form
                await session.execute(text("""
                    INSERT INTO forms (id, name, description, version, is_active, is_production, category, group_id, created_by_id, fields_schema, created_at, updated_at)
                    VALUES (:id, :name, :desc, 1, true, true, 'ticket_creation', :gid, :uid, :schema, now(), now())
                """), {
                    "id": uuid.uuid4(),
                    "name": "Plantilla Estándar de Tickets",
                    "desc": "Formulario principal para la apertura de incidentes técnicos.",
                    "gid": admin_group_id,
                    "uid": admin_user_id,
                    "schema": '{"fields": ' + str(ticket_fields).replace("'", '"').replace("True", "true").replace("False", "false") + '}'
                })

                # Asset Inventory Form
                await session.execute(text("""
                    INSERT INTO forms (id, name, description, version, is_active, is_production, category, group_id, created_by_id, fields_schema, created_at, updated_at)
                    VALUES (:id, :name, :desc, 1, true, true, 'asset_inventory', :gid, :uid, :schema, now(), now())
                """), {
                    "id": uuid.uuid4(),
                    "name": "Plantilla Estándar de Activos",
                    "desc": "Formulario para el registro de nuevos equipos en el inventario.",
                    "gid": admin_group_id,
                    "uid": admin_user_id,
                    "schema": '{"fields": ' + str(asset_fields).replace("'", '"').replace("True", "true").replace("False", "false") + '}'
                })
                
                await session.commit()
                print("Templates created successfully.")
            else:
                print("Production templates already exist.")
        except Exception as e:
            print(f"Error: {e}")
            await session.rollback()

if __name__ == "__main__":
    asyncio.run(init_forms())
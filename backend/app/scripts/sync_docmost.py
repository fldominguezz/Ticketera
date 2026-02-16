import asyncio
import logging
import uuid
import re
import os
from sqlalchemy.future import select
from sqlalchemy import text
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.db.models.group import Group
from sqlalchemy.ext.asyncio import create_async_engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- CONFIGURACIÓN DOCMOST (IDs REALES DETECTADOS) ---
EVERYONE_GROUP_ID = "019c5ed4-919d-7964-8dc3-749ea9cf96ad"
GENERAL_SPACE_ID = "019c5ed4-91ca-727f-adf5-32937b3545fc"

def get_wiki_engine():
    db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://ticketera_admin:password@db/ticketera_prod_db")
    new_url = re.sub(r'/[^/]+$', '/docmost_db', db_url)
    return create_async_engine(new_url)

async def sync_all():
    # 1. Obtener datos de Ticketera
    async with AsyncSessionLocal() as session:
        res_users = await session.execute(select(User).filter(User.is_active == True))
        ticketera_users = res_users.scalars().all()
        
        res_groups = await session.execute(select(Group))
        ticketera_groups = res_groups.scalars().all()

    # 2. Conectar a Docmost
    engine = get_wiki_engine()
    
    try:
        async with engine.begin() as conn:
            # Obtener el Workspace ID real de Docmost
            res_ws = await conn.execute(text("SELECT id FROM workspaces LIMIT 1"))
            ws_id = res_ws.scalar()
            if not ws_id:
                logger.error("No se encontró un Workspace en Docmost.")
                return
            
            logger.info(f"Sincronizando con Workspace: {ws_id}")

            # Sincronizar Grupos
            group_mapping = {} # Ticketera Name -> Docmost ID
            for g in ticketera_groups:
                res_g = await conn.execute(text("SELECT id FROM groups WHERE name = :name"), {"name": g.name})
                d_gid = res_g.scalar()
                
                if not d_gid:
                    d_gid = str(uuid.uuid4())
                    await conn.execute(text("""
                        INSERT INTO groups (id, workspace_id, name, is_default, created_at, updated_at)
                        VALUES (:id, :ws, :name, false, now(), now())
                    """), {"id": d_gid, "ws": ws_id, "name": g.name})
                    logger.info(f"Grupo creado en Docmost: {g.name}")
                
                group_mapping[g.name] = d_gid

            # Sincronizar Usuarios
            for u in ticketera_users:
                # 1. Crear/Actualizar Usuario
                res_u = await conn.execute(text("SELECT id FROM users WHERE email = :email"), {"email": u.email})
                d_uid = res_u.scalar()
                
                if not d_uid:
                    d_uid = str(uuid.uuid4())
                    await conn.execute(text("""
                        INSERT INTO users (id, name, email, email_verified_at, workspace_id, role, password, locale, created_at, updated_at)
                        VALUES (:id, :name, :email, now(), :ws, 'member', :pass, 'es', now(), now())
                    """), {
                        "id": d_uid, "name": f"{u.first_name} {u.last_name}", 
                        "email": u.email, "ws": ws_id, "pass": u.hashed_password
                    })
                    logger.info(f"Usuario creado en Docmost: {u.email}")
                else:
                    await conn.execute(text("""
                        UPDATE users SET name = :name, password = :pass, updated_at = now() 
                        WHERE id = :id
                    """), {"id": d_uid, "name": f"{u.first_name} {u.last_name}", "pass": u.hashed_password})

                # 2. Asegurar grupo 'Everyone'
                res_check_ev = await conn.execute(text("SELECT 1 FROM group_users WHERE user_id = :u AND group_id = :g"), 
                                                {"u": d_uid, "g": EVERYONE_GROUP_ID})
                if not res_check_ev.fetchone():
                    await conn.execute(text("INSERT INTO group_users (id, user_id, group_id, created_at, updated_at) VALUES (:id, :u, :g, now(), now())"),
                                     {"id": str(uuid.uuid4()), "u": d_uid, "g": EVERYONE_GROUP_ID})

                # 3. Asignar a su grupo de Ticketera
                if u.group_id:
                    # Buscar nombre del grupo
                    async with AsyncSessionLocal() as s2:
                        res_gn = await s2.execute(select(Group.name).where(Group.id == u.group_id))
                        g_name = res_gn.scalar()
                    
                    if g_name in group_mapping:
                        target_gid = group_mapping[g_name]
                        res_check_g = await conn.execute(text("SELECT 1 FROM group_users WHERE user_id = :u AND group_id = :g"), 
                                                       {"u": d_uid, "g": target_gid})
                        if not res_check_g.fetchone():
                            await conn.execute(text("INSERT INTO group_users (id, user_id, group_id, created_at, updated_at) VALUES (:id, :u, :g, now(), now())"),
                                             {"id": str(uuid.uuid4()), "u": d_uid, "g": target_gid})

                # 4. Asegurar acceso al espacio General
                res_check_sp = await conn.execute(text("SELECT 1 FROM space_members WHERE user_id = :u AND space_id = :s"), 
                                                 {"u": d_uid, "s": GENERAL_SPACE_ID})
                if not res_check_sp.fetchone():
                    await conn.execute(text("INSERT INTO space_members (id, user_id, space_id, role, created_at, updated_at) VALUES (:id, :u, :s, 'member', now(), now())"),
                                     {"id": str(uuid.uuid4()), "u": d_uid, "s": GENERAL_SPACE_ID})

        logger.info("Sincronización masiva finalizada con éxito.")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(sync_all())

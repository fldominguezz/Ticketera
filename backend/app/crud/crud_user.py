from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List
from uuid import UUID
import os
import logging
from sqlalchemy import text, delete
from sqlalchemy.ext.asyncio import create_async_engine

from app.db.models.user import User
from app.db.models.iam import UserRole
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash
from app.db.models.group import Group

import string
import random

logger = logging.getLogger(__name__)

# Workspace ID extraído dinámicamente
WORKSPACE_ID = "019c3e5c-6134-744e-9472-b39aea92e140"
EVERYONE_GROUP_ID = "019c3e5c-6139-78dd-bbe8-7bf10a25e006"
GENERAL_SPACE_ID = "019c3e5c-6148-7687-9f16-3f5475acd000"

# Mapeo de Grupos Ticketera -> Docmost (Space ID, Group ID)
DOCMOST_MAPPING = {
    "SOC": ("019c4ee5-9a48-7d17-b9f7-351b6b8a28ef", "019c4ee6-68dd-72d5-8ccd-ba158f0fb287"),
    "AREA SOC": ("019c4ee5-9a48-7d17-b9f7-351b6b8a28ef", "019c4ee6-68dd-72d5-8ccd-ba158f0fb287"),
    "Técnica": ("019c4ee6-3436-7439-806a-6c0dcd60b7ff", "019c4ee6-8e38-7cb0-a826-49a09015a704"),
    "AREA TECNICA": ("019c4ee6-3436-7439-806a-6c0dcd60b7ff", "019c4ee6-8e38-7cb0-a826-49a09015a704"),
    "Administración": ("019c4ee7-4ea6-75aa-9fdd-aa532422e39d", "019c4ee6-d4e0-700c-ac12-ffdc09fb5937"),
    "AREA ADMINISTRATIVA": ("019c4ee7-4ea6-75aa-9fdd-aa532422e39d", "019c4ee6-d4e0-700c-ac12-ffdc09fb5937"),
    "Seguridad Informática": ("019c4ee7-1534-70a8-a30e-2836114c9481", "019c4ee6-fb3f-7364-8cea-29f65ccaf947"),
    "DIVISION SEGURIDAD INFORMATICA": ("019c4ee7-1534-70a8-a30e-2836114c9481", "019c4ee6-fb3f-7364-8cea-29f65ccaf947"),
    "Concientización": ("019c4ee7-9d1d-7548-8891-97e1cd44cd0a", "019c4ee6-af3f-7571-8d7b-415af1a44bd9"),
    "AREA CONCIENTIZACION": ("019c4ee7-9d1d-7548-8891-97e1cd44cd0a", "019c4ee6-af3f-7571-8d7b-415af1a44bd9"),
}

class CRUDUser:
    def _get_wiki_engine(self):
        db_url = os.getenv("DATABASE_URL", "").replace("ticketera_db", "docmost_db").replace("ticketing_dev_db", "docmost_db")
        return create_async_engine(db_url)

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(select(User).filter(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_username(self, db: AsyncSession, username: str) -> Optional[User]:
        result = await db.execute(select(User).filter(User.username == username))
        return result.scalar_one_or_none()

    async def get_by_username_or_email(self, db: AsyncSession, identifier: str) -> Optional[User]:
        result = await db.execute(
            select(User).filter((User.username == identifier) | (User.email == identifier))
        )
        return result.scalar_one_or_none()

    async def get(self, db: AsyncSession, user_id: UUID) -> Optional[User]:
        result = await db.execute(select(User).filter(User.id == user_id))
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, obj_in: UserCreate) -> User:
        # Asegurar grupo
        if not obj_in.group_id:
            res_g = await db.execute(select(Group).limit(1))
            group = res_g.scalar_one_or_none()
            obj_in.group_id = group.id if group else None

        hashed_password = get_password_hash(obj_in.password)
        db_user = User(
            username=obj_in.username,
            email=obj_in.email,
            hashed_password=hashed_password,
            first_name=obj_in.first_name,
            last_name=obj_in.last_name,
            group_id=obj_in.group_id,
            is_active=obj_in.is_active,
            is_superuser=obj_in.is_superuser,
            force_password_change=obj_in.force_password_change
        )
        db.add(db_user)
        await db.flush()
        
        if obj_in.role_ids:
            for rid in obj_in.role_ids:
                db.add(UserRole(user_id=db_user.id, role_id=rid))
                
        await db.commit()
        await db.refresh(db_user)

        # Cargar relación de grupo para el sync
        res_group = await db.execute(select(Group).where(Group.id == db_user.group_id))
        db_user.group = res_group.scalar_one_or_none()

        # SYNC TO WIKI (CREATE)
        await self.sync_to_wiki(db_user, action="create")
        return db_user

    async def update(self, db: AsyncSession, db_obj: User, obj_in: UserUpdate) -> User:
        if obj_in.password:
            db_obj.hashed_password = get_password_hash(obj_in.password)
        
        update_data = obj_in.model_dump(exclude_unset=True)
        for var, value in update_data.items():
            if var not in ["password", "role_ids"]:
                setattr(db_obj, var, value)
        
        if obj_in.role_ids is not None:
            await db.execute(delete(UserRole).where(UserRole.user_id == db_obj.id))
            for rid in obj_in.role_ids:
                db.add(UserRole(user_id=db_obj.id, role_id=rid))
        
        await db.commit()
        await db.refresh(db_obj)
        
        # Cargar relación de grupo para el sync
        res_group = await db.execute(select(Group).where(Group.id == db_obj.group_id))
        db_obj.group = res_group.scalar_one_or_none()
        
        # SYNC TO WIKI (UPDATE)
        await self.sync_to_wiki(db_obj, action="update")
        return db_obj

    async def remove(self, db: AsyncSession, id: UUID) -> User:
        result = await db.execute(select(User).where(User.id == id))
        obj = result.scalar_one_or_none()
        if obj:
            # Capturamos el email antes de borrar para quitarlo de la Wiki
            email = obj.email
            await db.delete(obj)
            await db.commit()
            # SYNC TO WIKI (DELETE)
            await self.sync_to_wiki(None, email=email, action="delete")
        return obj

    async def sync_to_wiki(self, db_user: Optional[User], email: str = None, action: str = "create", plain_password: str = None):
        target_email = email if email else (db_user.email if db_user else None)
        if not target_email:
            return

        engine = self._get_wiki_engine()
        
        # Si la acción es borrar, o el usuario está desactivado, lo quitamos de la Wiki
        should_delete = action == "delete" or (db_user and not db_user.is_active)

        try:
            async with engine.begin() as conn:
                if should_delete:
                    await conn.execute(text("DELETE FROM users WHERE email = :email"), {"email": target_email})
                else:
                    # Generar hash BCrypt si tenemos el password plano
                    wiki_hash = db_user.hashed_password if db_user else None
                    if plain_password:
                        try:
                            import bcrypt
                            wiki_hash = bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                        except Exception as e:
                            pass
                    res = await conn.execute(text("SELECT id FROM users WHERE email = :email"), {"email": target_email})
                    exists_id = res.scalar()
                    
                    if not exists_id:
                        import uuid
                        uid = uuid.uuid4()
                        await conn.execute(text("""
                            INSERT INTO users (id, name, email, email_verified_at, workspace_id, role, password, locale, created_at, updated_at)
                            VALUES (:id, :name, :email, now(), :workspace_id, 'member', :password, 'es', now(), now())
                        """), {
                            "id": uid,
                            "name": f"{db_user.first_name} {db_user.last_name}",
                            "email": target_email,
                            "workspace_id": WORKSPACE_ID,
                            "password": wiki_hash
                        })
                    else:
                        await conn.execute(text("""
                            UPDATE users SET name = :name, password = :password, locale = 'es', updated_at = now() 
                            WHERE email = :email
                        """), {
                            "name": f"{db_user.first_name} {db_user.last_name}",
                            "password": wiki_hash,
                            "email": target_email
                        })

                    # OBTENER ID DE USUARIO EN DOCMOST
                    res_uid = await conn.execute(text("SELECT id FROM users WHERE email = :email"), {"email": target_email})
                    docmost_uid = res_uid.scalar()
                    
                    if docmost_uid:
                        import uuid
                        # 1. ASEGURAR GRUPO 'EVERYONE'
                        res_check = await conn.execute(text("SELECT 1 FROM group_users WHERE user_id = :u AND group_id = :g"), 
                                                     {"u": docmost_uid, "g": EVERYONE_GROUP_ID})
                        if not res_check.fetchone():
                            await conn.execute(text("""
                                INSERT INTO group_users (id, user_id, group_id, created_at, updated_at)
                                VALUES (:id, :u, :g, now(), now())
                            """), {"id": uuid.uuid4(), "u": docmost_uid, "g": EVERYONE_GROUP_ID})

                        # 1b. ASEGURAR ESPACIO 'GENERAL'
                        res_gen_check = await conn.execute(text("SELECT 1 FROM space_members WHERE user_id = :u AND space_id = :s"), 
                                                          {"u": docmost_uid, "s": GENERAL_SPACE_ID})
                        if not res_gen_check.fetchone():
                            await conn.execute(text("""
                                INSERT INTO space_members (id, user_id, space_id, role, created_at, updated_at)
                                VALUES (:id, :u, :s, 'member', now(), now())
                            """), {"id": uuid.uuid4(), "u": docmost_uid, "s": GENERAL_SPACE_ID})

                        # 2. ASIGNACIÓN DINÁMICA POR GRUPO
                        if db_user and hasattr(db_user, 'group') and db_user.group:
                            mapping = DOCMOST_MAPPING.get(db_user.group.name)
                            if mapping:
                                space_id, group_id = mapping
                                
                                # Asegurar Grupo Específico
                                res_g_check = await conn.execute(text("SELECT 1 FROM group_users WHERE user_id = :u AND group_id = :g"), 
                                                                {"u": docmost_uid, "g": group_id})
                                if not res_g_check.fetchone():
                                    await conn.execute(text("""
                                        INSERT INTO group_users (id, user_id, group_id, created_at, updated_at)
                                        VALUES (:id, :u, :g, now(), now())
                                    """), {"id": uuid.uuid4(), "u": docmost_uid, "g": group_id})

                                # Asegurar Espacio Específico
                                res_s_check = await conn.execute(text("SELECT 1 FROM space_members WHERE user_id = :u AND space_id = :s"), 
                                                                {"u": docmost_uid, "s": space_id})
                                if not res_s_check.fetchone():
                                    await conn.execute(text("""
                                        INSERT INTO space_members (id, user_id, space_id, role, created_at, updated_at)
                                        VALUES (:id, :u, :s, 'member', now(), now())
                                    """), {"id": uuid.uuid4(), "u": docmost_uid, "s": space_id})
            await engine.dispose()
        except Exception as e:
            logger.error(f"Wiki Sync Error: {e}")
            await engine.dispose()
        except Exception as e:
            logger.error(f"Wiki Sync Error: {e}")

user = CRUDUser()
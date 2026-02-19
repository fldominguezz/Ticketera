import asyncio
from sqlalchemy import select, update, delete, or_
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.db.models.ticket import Ticket, TicketComment, TicketWatcher
from app.db.models.audit_log import AuditLog
import uuid

async def unify_user():
    print("Iniciando unificación de usuario Ivan Alfredo AGUIRRE...")
    
    # Datos finales deseados
    FINAL_USERNAME = "iaguirre"
    FINAL_EMAIL = "iaguirre@policiafederal.gov.ar"
    FINAL_FIRST_NAME = "Ivan Alfredo"
    FINAL_LAST_NAME = "AGUIRRE"

    async with AsyncSessionLocal() as session:
        # 1. Buscar los candidatos
        result = await session.execute(select(User).where(
            or_(
                User.username.ilike("%ivan%"),
                User.username.ilike("%aguirre%"),
                User.first_name.ilike("%ivan%"),
                User.last_name.ilike("%aguirre%")
            )
        ))
        users = result.scalars().all()
        
        print(f"Usuarios encontrados: {[(u.username, f'{u.first_name} {u.last_name}', u.id) for u in users]}")
        
        if len(users) < 2:
            print("No se encontraron suficientes usuarios para unificar.")
            return

        # El primero será el primario (el que tenga iaguirre o el primero de la lista)
        primary = None
        to_merge = []

        for u in users:
            if u.username == "iaguirre" or u.username == "ivan_aguirre" or u.username == "iaguirre@policiafederal.gov.ar":
                primary = u
                break
        
        if not primary:
            primary = users[0]
            to_merge = [u for u in users if u.id != primary.id]
        else:
            to_merge = [u for u in users if u.id != primary.id]

        print(f"Usuario PRIMARIO: {primary.username} ({primary.id})")
        
        for secondary in to_merge:
            print(f"Unificando secundario: {secondary.username} ({secondary.id}) -> {primary.username}")
            
            # Reasignar Tickets creados
            await session.execute(update(Ticket).where(Ticket.creator_id == secondary.id).values(creator_id=primary.id))
            # Reasignar Tickets asignados
            await session.execute(update(Ticket).where(Ticket.assigned_to_id == secondary.id).values(assigned_to_id=primary.id))
            # Reasignar Comentarios
            await session.execute(update(TicketComment).where(TicketComment.author_id == secondary.id).values(author_id=primary.id))
            # Reasignar Watchers
            await session.execute(update(TicketWatcher).where(TicketWatcher.user_id == secondary.id).values(user_id=primary.id))
            # Reasignar Logs de Auditoría
            await session.execute(update(AuditLog).where(AuditLog.user_id == secondary.id).values(user_id=primary.id))
            
            # Eliminar el usuario secundario
            await session.execute(delete(User).where(User.id == secondary.id))

        # 2. Actualizar datos del primario
        primary.username = FINAL_USERNAME
        primary.email = FINAL_EMAIL
        primary.first_name = FINAL_FIRST_NAME
        primary.last_name = FINAL_LAST_NAME
        
        await session.commit()
        print(f"Unificación completada con éxito. Usuario final: {primary.username} | {primary.first_name} {primary.last_name}")

if __name__ == "__main__":
    asyncio.run(unify_user())

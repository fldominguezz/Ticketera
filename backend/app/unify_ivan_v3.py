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
        # 1. Buscar al usuario iaguirre (primario)
        res_p = await session.execute(select(User).where(User.username == "iaguirre"))
        primary = res_p.scalar_one_or_none()
        
        if not primary:
            print("No se encontró el usuario primario 'iaguirre'.")
            # Intento buscarlo por mail o por 'aivan'
            res_p = await session.execute(select(User).where(User.username.ilike("%aivan%")))
            primary = res_p.scalar_one_or_none()
            if not primary:
                print("No se encontró ningún usuario base. Abortando.")
                return

        print(f"Usuario PRIMARIO identificado: {primary.username} ({primary.id})")

        # 2. Buscar al usuario 'alfredo ivan' o similares que NO sean el primario
        # Me dijiste 'alfredo ivan'
        res_s = await session.execute(select(User).where(
            (User.username.ilike("%aivan%")) | (User.first_name.ilike("%alfredo%"))
        ))
        candidates = res_s.scalars().all()
        to_merge = [u for u in candidates if u.id != primary.id]

        if not to_merge:
            print("No se encontró el usuario duplicado para fusionar.")
            # Si no hay para fusionar, igual actualizamos el primario con los datos correctos
        else:
            for secondary in to_merge:
                print(f"Fusionando secundario: {secondary.username} ({secondary.id}) -> {primary.username}")
                
                # Reasignar relaciones
                await session.execute(update(Ticket).where(Ticket.created_by_id == secondary.id).values(created_by_id=primary.id))
                await session.execute(update(Ticket).where(Ticket.assigned_to_id == secondary.id).values(assigned_to_id=primary.id))
                await session.execute(update(TicketComment).where(TicketComment.user_id == secondary.id).values(user_id=primary.id))
                await session.execute(update(TicketWatcher).where(TicketWatcher.user_id == secondary.id).values(user_id=primary.id))
                await session.execute(update(AuditLog).where(AuditLog.user_id == secondary.id).values(user_id=primary.id))
                
                # Eliminar el usuario secundario
                await session.execute(delete(User).where(User.id == secondary.id))

        # 3. Actualizar datos finales del primario
        primary.username = FINAL_USERNAME
        primary.email = FINAL_EMAIL
        primary.first_name = FINAL_FIRST_NAME
        primary.last_name = FINAL_LAST_NAME
        
        await session.commit()
        print(f"EXITO: Usuario unificado como '{primary.username}' | {primary.first_name} {primary.last_name}")

if __name__ == "__main__":
    asyncio.run(unify_user())

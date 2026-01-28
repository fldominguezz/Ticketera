import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def clean():
    async with AsyncSessionLocal() as session:
        # Get user id first
        res = await session.execute(text("SELECT id FROM users WHERE username = 'admin'"))
        user = res.scalar_one_or_none()
        
        if user:
            print(f"Cleaning data for user {user}...")
            # 1. Audit Logs
            await session.execute(text(f"DELETE FROM audit_logs WHERE user_id = '{user}'"))
            
            # 2. Daily Reports
            await session.execute(text(f"DELETE FROM daily_reports WHERE created_by_id = '{user}'"))
            
            # 3. Tickets (Need to clear attachments first if linked to ticket)
            # Find tickets by user
            tickets_res = await session.execute(text(f"SELECT id FROM tickets WHERE created_by_id = '{user}' OR assigned_to_id = '{user}'"))
            ticket_ids = tickets_res.scalars().all()
            
            if ticket_ids:
                t_ids_str = ", ".join([f"'{tid}'" for tid in ticket_ids])
                # Delete attachments linked to these tickets
                await session.execute(text(f"DELETE FROM attachments WHERE ticket_id IN ({t_ids_str})"))
                # Also delete ticket_endpoints, ticket_comments etc if any? Assuming CASCADE or manual cleanup
                # Let's try simple delete of tickets now
                await session.execute(text(f"DELETE FROM tickets WHERE id IN ({t_ids_str})"))

            # 4. User itself
            await session.execute(text(f"DELETE FROM users WHERE id = '{user}'"))
            await session.commit()
            print("Admin user and related data deleted.")
        else:
            print("Admin user not found.")

if __name__ == "__main__":
    asyncio.run(clean())

import asyncio
from sqlalchemy import select, text
from app.db.session import AsyncSessionLocal
from app.db.models.audit import AuditLog

async def check_audit():
    async with AsyncSessionLocal() as db:
        # Buscar logs de login fallidos o eventos de integración
        query = text("SELECT * FROM audit_log WHERE details::text LIKE '%fortisiem%' OR details::text LIKE '%fortisiem@example.com%' ORDER BY created_at DESC LIMIT 10")
        result = await db.execute(query)
        rows = result.fetchall()
        for row in rows:
            print(f"Time: {row.created_at} | Event: {row.event_type} | IP: {row.ip_address} | Details: {row.details}")

if __name__ == "__main__":
    asyncio.run(check_audit())

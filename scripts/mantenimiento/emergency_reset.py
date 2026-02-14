import asyncio
from app.db.session import AsyncSessionLocal
from app.crud.crud_user import user as crud_user
from app.core.security import get_password_hash

async def reset():
    async with AsyncSessionLocal() as db:
        u = await crud_user.get_by_username(db, username='admin')
        if u:
            new_hash = get_password_hash("admin123")
            from sqlalchemy import text
            await db.execute(
                text("UPDATE users SET hashed_password = :h, is_active = true WHERE id = :id"),
                {"h": new_hash, "id": u.id}
            )
            await db.commit()
            print("RESET_SUCCESS")
        else:
            print("USER_NOT_FOUND")

if __name__ == "__main__":
    asyncio.run(reset())

import asyncio
from app.db.session import AsyncSessionLocal
from app.crud.crud_user import user
from app.schemas.user import UserUpdate

async def reset_admin():
    async with AsyncSessionLocal() as db:
        u = await user.get_by_email(db, email="admin@example.com")
        if u:
            print(f"Found user {u.email}. Resetting password...")
            await user.update(db, db_obj=u, obj_in=UserUpdate(password="adminpassword"))
            print("Password reset successfully.")
        else:
            print("User admin@example.com NOT FOUND.")

if __name__ == "__main__":
    asyncio.run(reset_admin())
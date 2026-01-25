import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.db.models.group import Group

async def check_users():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User, Group.name).outerjoin(Group, User.group_id == Group.id)
        )
        users = result.all()
        print(f"{'Username':<20} | {'Group Name':<30}")
        print("-" * 55)
        for user, group_name in users:
            print(f"{user.username:<20} | {str(group_name):<30}")

if __name__ == "__main__":
    asyncio.run(check_users())

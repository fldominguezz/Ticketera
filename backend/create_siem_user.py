import asyncio
import uuid
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.db.models.group import Group
from app.core.security import get_password_hash

async def create_siem_user():
    async with AsyncSessionLocal() as db:
        # Check if user already exists
        result = await db.execute(select(User).filter(User.email == "fortisiem@example.com"))
        if result.scalars().first():
            print("User fortisiem@example.com already exists.")
            return

        # Get a valid group_id (try root group or the first available one)
        soc_group_result = await db.execute(select(Group).filter(Group.name == "Área Soc"))
        soc_group = soc_group_result.scalars().first()

        if not soc_group:
            print("Área Soc group not found, creating it...")
            soc_group = Group(id=uuid.uuid4(), name="Área Soc", description="Security Operations Center")
            db.add(soc_group)
            await db.commit()
            await db.refresh(soc_group)
            print(f"Área Soc group created: {soc_group.name} ({soc_group.id})")
        
        group_id = soc_group.id
        print(f"Using group: {soc_group.name} ({group_id})")

        new_user = User(
            id=uuid.uuid4(),
            username="fortisiem",
            email="fortisiem@example.com",
            hashed_password=get_password_hash("qweasd456"),
            first_name="Forti",
            last_name="SIEM",
            is_active=True,
            is_superuser=False,
            group_id=group_id,
            preferred_language="es"
        )
        
        db.add(new_user)
        await db.commit()
        print(f"User created successfully: {new_user.email}")

if __name__ == "__main__":
    asyncio.run(create_siem_user())

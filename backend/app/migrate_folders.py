import asyncio
import re
from sqlalchemy import select, update, delete
from app.db.session import AsyncSessionLocal
from app.db.models.location import LocationNode
from app.db.models.asset import Asset
from app.db.models.asset_history import AssetLocationHistory
async def migrate_folders():
    async with AsyncSessionLocal() as session:
        # 1. Get all location nodes
        result = await session.execute(select(LocationNode))
        locations = result.scalars().all()
        # Regex to extract name and code
        pattern = re.compile(r'^(.*?)\s*\(?(?:cod\.?|Cód\.?|Cod:?|Cód:?|CÓD\.?)\s*(\d+)\)?\s*$', re.IGNORECASE)
        for loc in locations:
            match = pattern.search(loc.name)
            if match:
                dep_name = match.group(1).strip()
                dep_code = match.group(2).strip()
                # Update assets in this location
                await session.execute(
                    update(Asset)
                    .where(Asset.location_node_id == loc.id)
                    .values(dependencia=dep_name, codigo_dependencia=dep_code)
                )
            else:
                # If no code, just set dependencia as name
                await session.execute(
                    update(Asset)
                    .where(Asset.location_node_id == loc.id)
                    .values(dependencia=loc.name.strip())
                )
        await session.commit()
        # 2. Clear location_node_id from all assets
        await session.execute(update(Asset).values(location_node_id=None))
        # Also clear references in history to avoid FK violations
        # Since new_location_id is NOT NULL, we might have to delete history or change it to nullable
        # Let's check AssetLocationHistory model again. 
        # new_location_id = Column(UUID(as_uuid=True), ForeignKey("location_nodes.id"), nullable=False)
        # It's NOT NULL. So we should probably just delete the history if we are deleting all locations.
        await session.execute(delete(AssetLocationHistory))
        await session.commit()
        # 3. Delete all locations
        await session.execute(update(LocationNode).values(parent_id=None))
        await session.commit()
        await session.execute(delete(LocationNode))
        await session.commit()
if __name__ == "__main__":
    asyncio.run(migrate_folders())
import asyncio
from app.db.session import AsyncSessionLocal
from app.db.models.location import LocationNode
from sqlalchemy import select
from sqlalchemy.orm import selectinload

def fix_text(text: str) -> str:
    if not text:
        return text
    try:
        # Many of these look like UTF-8 bytes interpreted as ISO-8859-1 (latin1)
        # e.g. 'Ã³' is '\xc3\xb3' in UTF-8, which is 'ó'
        return text.encode('latin1').decode('utf-8')
    except (UnicodeEncodeError, UnicodeDecodeError):
        # Fallback: manual replacements if needed, but the above usually works for this specific mess
        replacements = {
            "Ã³": "ó",
            "Ã¡": "á",
            "Ã©": "é",
            "Ã­": "í",
            "Ãº": "ú",
            "Ã±": "ñ",
            "Ã": "Ñ",
            "Âª": "ª",
            "Ã": "í" # Sometimes it gets even worse
        }
        fixed = text
        for old, new in replacements.items():
            fixed = fixed.replace(old, new)
        return fixed

async def fix_all_locations():
    async with AsyncSessionLocal() as db:
        # Get all locations to be sure we fix hierarchy properly
        res = await db.execute(select(LocationNode).order_by(LocationNode.path))
        locs = res.scalars().all()
        
        print(f"Checking {len(locs)} locations...")
        
        # We need to update names first, then rebuild paths based on parent paths
        # to ensure consistency.
        
        # 1. Fix names in memory first
        for loc in locs:
            old_name = loc.name
            new_name = fix_text(old_name)
            if old_name != new_name:
                print(f"Fixing name: {old_name} -> {new_name}")
                loc.name = new_name
        
        # 2. Rebuild paths based on parents
        # We sort by path length to ensure we process parents before children
        locs_sorted = sorted(locs, key=lambda x: x.path.count('/'))
        
        path_map = {} # id -> fixed_path
        
        for loc in locs_sorted:
            if loc.parent_id is None:
                # Root nodes (like PFA)
                new_path = loc.name
            else:
                parent_path = path_map.get(loc.parent_id)
                if parent_path:
                    new_path = f"{parent_path}/{loc.name}"
                else:
                    # Parent not in map? Should not happen with sorted list, but fallback
                    new_path = fix_text(loc.path)
            
            if loc.path != new_path:
                print(f"Fixing path: {loc.path} -> {new_path}")
                loc.path = new_path
            
            path_map[loc.id] = new_path

        await db.commit()
        print("Done!")

if __name__ == "__main__":
    asyncio.run(fix_all_locations())

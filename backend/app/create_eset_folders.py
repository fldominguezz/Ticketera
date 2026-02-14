import asyncio
import os
import sys
from uuid import UUID

# Ajustar path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal
from app.crud.crud_location import location as crud_location

async def run():
    input_file = '/app/ESETGRUPOS.txt'
    if not os.path.exists(input_file):
        return

    with open(input_file, 'r', encoding='latin-1') as f:
        lines = [line.strip() for line in f if line.strip()]

    # 1. Limpieza y extracción de rutas
    cleaned_paths = []
    prefixes = ["Todos\\Empresas\\", "All Groups\\", "Everything\\", "Static Groups\\"]
    
    for line in lines:
        p = line
        for pref in prefixes:
            if p.startswith(pref):
                p = p[len(pref):]
        
        parts = p.split('\\')
        if len(parts) > 1:
            # Quitamos el host (última parte)
            cleaned_paths.append('\\'.join(parts[:-1]))

    # 2. Quedarse solo con las más largas
    unique_paths = sorted(list(set(cleaned_paths)), key=len, reverse=True)
    final_paths = []
    for p in unique_paths:
        is_subset = False
        for longer in final_paths:
            if longer.startswith(p + '\\'):
                is_subset = True
                break
        if not is_subset:
            final_paths.append(p)

    # 3. Creación en BD
    async with AsyncSessionLocal() as db:
        count = 0
        for path in sorted(final_paths):
            clean_path = path.replace('\\', '/')
            # Forzamos raíz PFA/ESET CLOUD
            if clean_path.startswith('PFA/'):
                target_path = clean_path.replace('PFA/', 'PFA/ESET CLOUD/', 1)
            else:
                target_path = f'PFA/ESET CLOUD/{clean_path}'
            
            try:
                await crud_location.get_or_create_by_path(db, target_path)
                count += 1
                if count % 20 == 0:
                    await db.commit()
            except Exception as e:
        
        await db.commit()

if __name__ == "__main__":
    asyncio.run(run())

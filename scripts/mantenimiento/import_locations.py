import asyncio
import csv
import uuid
import os
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Configuración de base de datos
DATABASE_URL = "postgresql+asyncpg://user:password@db:5432/ticketing_dev_db"
engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

CSV_FILE = "/app/dependencias.csv"

async def import_locations():
    if not os.path.exists(CSV_FILE):
        print(f"Error: {CSV_FILE} no encontrado.")
        return

    # 1. Leer CSV y organizar datos
    rows = []
    with open(CSV_FILE, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    print(f"Leídos {len(rows)} registros del CSV.")

    # Mapeo de ID del CSV -> UUID de la DB
    id_to_uuid = {}
    
    async with AsyncSessionLocal() as session:
        async with session.begin():
            # Limpiar tabla actual si es necesario (Opcional, comentar si se quiere mantener)
            # await session.execute(text("TRUNCATE location_nodes CASCADE"))
            
            # 2. Primero procesar las Superintendencias (donde id == superintendencia)
            # o aquellas que son raiz.
            for row in rows:
                csv_id = row['id']
                super_id = row['superintendencia']
                
                if csv_id == super_id:
                    new_uuid = uuid.uuid4()
                    name = row['nombre_dependencia'].strip()
                    code = row['codigo'].strip()
                    
                    # Evitar duplicados por dependency_code
                    check = await session.execute(text("SELECT id FROM location_nodes WHERE dependency_code = :code"), {"code": code})
                    if check.scalar():
                        continue

                    await session.execute(text("""
                        INSERT INTO location_nodes (id, parent_id, name, dependency_code, path, created_at, updated_at)
                        VALUES (:id, NULL, :name, :code, :path, now(), now())
                    """), {
                        "id": new_uuid,
                        "name": name,
                        "code": code,
                        "path": name
                    })
                    id_to_uuid[csv_id] = new_uuid

            print(f"Superintendencias creadas.")

            # 3. Procesar el resto de dependencias
            # Ordenamos para asegurar que el padre exista (aunque con superintendencias suele bastar)
            for row in rows:
                csv_id = row['id']
                super_id = row['superintendencia']
                
                if csv_id == super_id:
                    continue # Ya procesada
                
                parent_uuid = id_to_uuid.get(super_id)
                if not parent_uuid:
                    # Si la superintendencia no se marcó a si misma, buscamos su UUID de todas formas
                    continue

                new_uuid = uuid.uuid4()
                name = row['nombre_dependencia'].strip()
                code = row['codigo'].strip()
                
                # Obtener path del padre
                res = await session.execute(text("SELECT path FROM location_nodes WHERE id = :id"), {"id": parent_uuid})
                parent_path = res.scalar()
                full_path = f"{parent_path} / {name}"

                # Evitar duplicados por dependency_code
                check = await session.execute(text("SELECT id FROM location_nodes WHERE dependency_code = :code"), {"code": code})
                if check.scalar():
                    continue

                await session.execute(text("""
                    INSERT INTO location_nodes (id, parent_id, name, dependency_code, path, created_at, updated_at)
                    VALUES (:id, :parent_id, :name, :code, :path, now(), now())
                """), {
                    "id": new_uuid,
                    "parent_id": parent_uuid,
                    "name": name,
                    "code": code,
                    "path": full_path
                })
                id_to_uuid[csv_id] = new_uuid

            print(f"Dependencias creadas exitosamente.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(import_locations())
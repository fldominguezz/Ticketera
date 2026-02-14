import asyncio
import csv
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.db.models.location import LocationNode
import uuid
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
CSV_PATH = "/app/dependencias.csv"
async def import_flat_locations():
    async with AsyncSessionLocal() as session:
        logger.info("Iniciando importación plana de dependencias...")
        # 1. Asegurar nodo raíz
        root_name = "DEPENDENCIAS PFA"
        res_root = await session.execute(select(LocationNode).where(LocationNode.name == root_name))
        root_node = res_root.scalar_one_or_none()
        if not root_node:
            root_node = LocationNode(
                id=uuid.uuid4(),
                name=root_name,
                path=root_name,
                dependency_code="ROOT_PFA"
            )
            session.add(root_node)
            await session.flush()
            logger.info("Creado nodo raíz 'DEPENDENCIAS PFA'")
        count = 0
        try:
            with open(CSV_PATH, mode='r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    nombre = row.get('nombre_dependencia', '').strip()
                    codigo = row.get('codigo', '').strip()
                    if not nombre or not codigo:
                        continue
                    # Verificar si ya existe por código para no duplicar
                    res = await session.execute(select(LocationNode).where(LocationNode.dependency_code == codigo))
                    existing = res.scalar_one_or_none()
                    if not existing:
                        new_loc = LocationNode(
                            id=uuid.uuid4(),
                            name=nombre,
                            dependency_code=codigo,
                            parent_id=root_node.id,
                            path=f"{root_name}/{nombre}"
                        )
                        session.add(new_loc)
                        count += 1
                    else:
                        # Si existe, actualizamos el nombre por si cambió
                        existing.name = nombre
                        existing.path = f"{root_name}/{nombre}"
                        session.add(existing)
                    # Commit cada 100 registros
                    if count % 100 == 0:
                        await session.commit()
            await session.commit()
            logger.info(f"Importación terminada. Se procesaron {count} nuevas dependencias.")
        except Exception as e:
            logger.error(f"Error en la importación: {e}")
            await session.rollback()
if __name__ == "__main__":
    asyncio.run(import_flat_locations())

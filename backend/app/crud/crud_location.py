from typing import List, Optional, Any, Dict
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func

from app.db.models.location import LocationNode
from app.db.models.asset import Asset
from app.schemas.location import LocationNodeCreate, LocationNodeUpdate

class CRUDLocation:
    async def get(self, db: AsyncSession, id: UUID) -> Optional[LocationNode]:
        result = await db.execute(select(LocationNode).filter(LocationNode.id == id))
        return result.scalar_one_or_none()
    
    async def get_all(self, db: AsyncSession) -> List[LocationNode]:
        result = await db.execute(select(LocationNode))
        nodes = result.scalars().all()
        
        # Inyectar conteo de activos (Lógica ESET)
        # Obtenemos conteo directo por nodo
        asset_counts_res = await db.execute(
            select(Asset.location_node_id, func.count(Asset.id))
            .group_by(Asset.location_node_id)
        )
        direct_counts = {str(row[0]): row[1] for row in asset_counts_res.fetchall() if row[0]}
        
        # Función para calcular conteo total (recursivo)
        def get_total_count(node_id: str, all_nodes: List[LocationNode], counts: Dict[str, int]) -> int:
            total = counts.get(node_id, 0)
            children = [str(n.id) for n in all_nodes if str(n.parent_id) == node_id]
            for child_id in children:
                total += get_total_count(child_id, all_nodes, counts)
            return total

        # Enriquecer los objetos con el conteo (esto es dinámico, no se guarda en DB)
        for node in nodes:
            # Solo los nodos raíz o por solicitud específica mostramos el total recursivo
            # Para simplificar al frontend, calculamos el total para todos
            setattr(node, "total_assets", get_total_count(str(node.id), nodes, direct_counts))
            setattr(node, "direct_assets", direct_counts.get(str(node.id), 0))

        return nodes

    async def create(self, db: AsyncSession, obj_in: LocationNodeCreate) -> LocationNode:
        db_obj = LocationNode(**obj_in.model_dump())
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj, attribute_names=[
            "id", "name", "path", "owner_group_id", "permissions", "parent_id", "created_at", "updated_at"
        ])
        return db_obj

    async def update(self, db: AsyncSession, db_obj: LocationNode, obj_in: LocationNodeUpdate) -> LocationNode:
        old_name = db_obj.name
        old_path = db_obj.path
        
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        if "name" in update_data and update_data["name"] != old_name:
            if db_obj.parent_id:
                parent = await self.get(db, db_obj.parent_id)
                db_obj.path = f"{parent.path}/{db_obj.name}" if parent else db_obj.name
            else:
                db_obj.path = db_obj.name
            
            new_path = db_obj.path
            result = await db.execute(select(LocationNode).filter(LocationNode.path.like(f"{old_path}/%")))
            children = result.scalars().all()
            
            for child in children:
                child.path = child.path.replace(old_path, new_path, 1)
                db.add(child)

        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj, attribute_names=[
            "id", "name", "path", "owner_group_id", "permissions", "parent_id", "created_at", "updated_at"
        ])
        return db_obj

    async def delete(self, db: AsyncSession, id: UUID) -> Optional[LocationNode]:
        from app.db.models.asset import Asset
        from app.db.models.asset_history import AssetLocationHistory
        from sqlalchemy import update as sa_update, delete as sa_delete
        import logging
        logger = logging.getLogger(__name__)

        obj = await self.get(db, id)
        if not obj:
            logger.warning(f"Location {id} not found for deletion.")
            return None

        # 1. Buscar o crear carpeta "Perdidos y encontrados"
        lf_name = "Perdidos y Encontrados (Lost And Found)"
        lf_res = await db.execute(select(LocationNode).filter(LocationNode.name == lf_name))
        lf_node = lf_res.scalar_one_or_none()
        
        if not lf_node:
            logger.info("Creating Lost and Found folder...")
            lf_node = LocationNode(name=lf_name, path=lf_name)
            db.add(lf_node)
            await db.flush()

        # 2. Identificar todos los descendientes (subcarpetas) recursivamente por path
        result = await db.execute(select(LocationNode.id).filter(LocationNode.path.like(f"{obj.path}/%")))
        descendant_ids = [row[0] for row in result.fetchall()]
        all_ids_to_remove = [id] + descendant_ids
        
        logger.info(f"Removing location {id} and {len(descendant_ids)} descendants. All IDs: {all_ids_to_remove}")

        # 3. Mover todos los activos de estas carpetas a Perdidos y Encontrados
        await db.execute(
            sa_update(Asset)
            .where(Asset.location_node_id.in_(all_ids_to_remove))
            .values(location_node_id=lf_node.id)
        )

        # 4. Reasignar historial de ubicaciones para evitar violación de FK
        # Reasignar 'new_location_id'
        await db.execute(
            sa_update(AssetLocationHistory)
            .where(AssetLocationHistory.new_location_id.in_(all_ids_to_remove))
            .values(new_location_id=lf_node.id)
        )
        # Reasignar 'previous_location_id'
        await db.execute(
            sa_update(AssetLocationHistory)
            .where(AssetLocationHistory.previous_location_id.in_(all_ids_to_remove))
            .values(previous_location_id=lf_node.id)
        )

        # 5. Borrar todos los nodos identificados
        await db.execute(
            sa_delete(LocationNode)
            .where(LocationNode.id.in_(all_ids_to_remove))
        )

        await db.commit()
        logger.info(f"Successfully deleted location {id} and cleaned up history.")
        return obj

    async def get_or_create_by_path(self, db: AsyncSession, path_str: str) -> UUID:
        """
        Refined path processor for PFA / FortiSIEM.
        """
        if not path_str or str(path_str).lower() == "none" or path_str == "/":
            return None
            
        # 1. Normalizar separadores y dividir si hay múltiples rutas
        # EMS a veces exporta: "All Groups/A, All Groups/A/B"
        path_str = path_str.replace("\\", "/")
        raw_paths = [p.strip() for p in path_str.split(",") if p.strip()]
        if not raw_paths: return None
        
        # 2. Elegir la ruta más profunda (la que tiene más subcarpetas)
        best_path = max(raw_paths, key=lambda p: p.count("/"))
        
        # 3. Limpiar prefijos de sistema para que PFA sea raíz
        prefixes_to_strip = ["All Groups/", "Todos/", "Empresas/", "Everything/", "Static Groups/"]
        for prefix in prefixes_to_strip:
            if best_path.startswith(prefix):
                best_path = best_path[len(prefix):]
        
        # 4. Asegurar que cuelgue de PFA si no es absoluta
        if not best_path.startswith("PFA"):
            best_path = "PFA/" + best_path.lstrip("/")
        
        # Eliminar duplicados accidentales de PFA/PFA/
        best_path = best_path.replace("PFA/PFA/", "PFA/")
        
        parts = [p.strip() for p in best_path.split("/") if p.strip()]
        if not parts: return None

        current_parent_id = None
        current_full_path = ""

        for part in parts:
            # Construimos el path acumulado de forma prolija
            current_full_path = f"{current_full_path}/{part}" if current_full_path else part
            
            # Buscar el nodo por nombre y padre actual
            query = select(LocationNode).filter(
                LocationNode.name == part,
                LocationNode.parent_id == current_parent_id
            )
            res = await db.execute(query)
            node = res.scalar_one_or_none()
            
            if not node:
                # Si no existe, lo creamos con el path acumulado
                # Usamos un try/except por si hay un conflicto de concurrencia
                try:
                    node = LocationNode(
                        name=part,
                        path=current_full_path,
                        parent_id=current_parent_id
                    )
                    db.add(node)
                    await db.flush() 
                except Exception:
                    await db.rollback()
                    # Si falló por conflicto, re-buscamos
                    res = await db.execute(query)
                    node = res.scalar_one()
            
            current_parent_id = node.id
            
        return current_parent_id

location = CRUDLocation()
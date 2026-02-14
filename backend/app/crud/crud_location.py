from typing import List, Optional, Any, Dict
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, update as sa_update, delete as sa_delete, Integer
import logging

from app.db.models.location import LocationNode
from app.db.models.asset import Asset
from app.db.models.asset_history import AssetLocationHistory
from app.schemas.location import LocationNodeCreate, LocationNodeUpdate

logger = logging.getLogger(__name__)

class CRUDLocation:
    async def get(self, db: AsyncSession, id: UUID) -> Optional[LocationNode]:
        result = await db.execute(select(LocationNode).filter(LocationNode.id == id))
        return result.scalar_one_or_none()
    
    async def get_all(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> Dict[str, Any]:
        # Contar total primero
        total_res = await db.execute(select(func.count(LocationNode.id)))
        total = total_res.scalar() or 0

        # Ordenar numéricamente por dependency_code
        result = await db.execute(
            select(LocationNode)
            .order_by(
                func.nullif(func.regexp_replace(LocationNode.dependency_code, '[^0-9]', '', 'g'), '').cast(Integer).asc(),
                LocationNode.dependency_code.asc()
            )
            .offset(skip).limit(limit)
        )
        nodes = result.scalars().all()
        
        asset_counts_res = await db.execute(
            select(Asset.location_node_id, func.count(Asset.id))
            .group_by(Asset.location_node_id)
        )
        direct_counts = {str(row[0]): row[1] for row in asset_counts_res.fetchall() if row[0]}
        
        # Cache de conteos totales para evitar recursion excesiva
        total_counts_cache = {}

        def get_total_count(node_id: str, all_nodes: List[LocationNode], counts: Dict[str, int]) -> int:
            if node_id in total_counts_cache:
                return total_counts_cache[node_id]
            
            total_count = counts.get(node_id, 0)
            # Para conteo jerárquico real necesitaríamos todos los nodos, 
            # pero si estamos paginando solo tenemos una parte.
            # Por ahora devolveremos el conteo directo para simplificar o 
            # podríamos traer todos los IDs si fuera crítico.
            
            total_counts_cache[node_id] = total_count
            return total_count

        for node in nodes:
            node.total_assets = get_total_count(str(node.id), nodes, direct_counts)
            node.direct_assets = direct_counts.get(str(node.id), 0)

        return {
            "items": nodes,
            "total": total
        }

    async def create(self, db: AsyncSession, obj_in: LocationNodeCreate) -> LocationNode:
        from fastapi import HTTPException
        if obj_in.dependency_code:
            existing_code = await db.execute(select(LocationNode).filter(LocationNode.dependency_code == obj_in.dependency_code))
            if existing_code.scalar_one_or_none():
                raise HTTPException(status_code=400, detail=f"El código de dependencia '{obj_in.dependency_code}' ya está en uso.")

        path = obj_in.path or obj_in.name
        existing_path = await db.execute(select(LocationNode).filter(LocationNode.path == path))
        if existing_path.scalar_one_or_none():
             path = f"{path} ({obj_in.dependency_code})" if obj_in.dependency_code else f"{path} (Duplicado)"

        db_obj = LocationNode(
            name=obj_in.name,
            dependency_code=obj_in.dependency_code,
            path=path,
            parent_id=obj_in.parent_id,
            owner_group_id=obj_in.owner_group_id,
            permissions=obj_in.permissions
        )
        db.add(db_obj)
        try:
            await db.commit()
        except Exception:
            await db.rollback()
            raise HTTPException(status_code=400, detail="Error de integridad al guardar la dependencia.")
            
        await db.refresh(db_obj)
        return db_obj

    async def update(self, db: AsyncSession, db_obj: LocationNode, obj_in: LocationNodeUpdate) -> LocationNode:
        from fastapi import HTTPException
        update_data = obj_in.model_dump(exclude_unset=True)
        if "dependency_code" in update_data and update_data["dependency_code"] != db_obj.dependency_code:
            existing_code = await db.execute(select(LocationNode).filter(LocationNode.dependency_code == update_data["dependency_code"]))
            if existing_code.scalar_one_or_none():
                raise HTTPException(status_code=400, detail=f"El código '{update_data['dependency_code']}' ya pertenece a otra dependencia.")

        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def _get_all_descendants(self, db: AsyncSession, parent_id: UUID) -> List[UUID]:
        """Obtiene recursivamente todos los IDs de los hijos."""
        result = await db.execute(select(LocationNode.id).where(LocationNode.parent_id == parent_id))
        child_ids = [row[0] for row in result.fetchall()]
        all_descendants = []
        for cid in child_ids:
            all_descendants.append(cid)
            all_descendants.extend(await self._get_all_descendants(db, cid))
        return all_descendants

    async def delete(self, db: AsyncSession, id: UUID) -> Optional[LocationNode]:
        obj = await self.get(db, id)
        if not obj: return None
    pass
        # 1. Asegurar carpeta de rescate específica
        lf_name = "Lost and Found"
        lf_code = "0000"
        lf_res = await db.execute(select(LocationNode).filter(LocationNode.dependency_code == lf_code))
        lf_node = lf_res.scalar_one_or_none()
        
        if not lf_node:
            lf_node = LocationNode(name=lf_name, path=lf_name, dependency_code=lf_code)
            db.add(lf_node)
            await db.flush()

        if lf_node.id == id:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="No se puede eliminar la carpeta de rescate Lost and Found (0000).")

        # 2. Obtener todos los hijos recursivamente
        all_ids_to_remove = [id] + await self._get_all_descendants(db, id)
        
        # 3. Mover activos e historial al Lost & Found
        await db.execute(sa_update(Asset).where(Asset.location_node_id.in_(all_ids_to_remove)).values(location_node_id=lf_node.id))
        await db.execute(sa_update(AssetLocationHistory).where(AssetLocationHistory.new_location_id.in_(all_ids_to_remove)).values(new_location_id=lf_node.id))
        await db.execute(sa_update(AssetLocationHistory).where(AssetLocationHistory.previous_location_id.in_(all_ids_to_remove)).values(previous_location_id=lf_node.id))

        # 4. Borrar nodos (ordenados por profundidad para evitar errores de FK interna si los hubiera, 
        # aunque el delete in_ es atómico en Postgres)
        await db.execute(sa_delete(LocationNode).where(LocationNode.id.in_(all_ids_to_remove)))
        
        await db.commit()
        return obj

    async def get_or_create_by_path(self, db: AsyncSession, path_str: str) -> UUID:
        if not path_str or str(path_str).lower() == "none" or path_str == "/": return None
        path_str = path_str.replace("\\", "/")
        raw_paths = [p.strip() for p in path_str.split(",") if p.strip()]
        if not raw_paths: return None
        best_path = max(raw_paths, key=lambda p: p.count("/"))
        prefixes = ["All Groups/", "Todos/", "Empresas/", "Everything/", "Static Groups/"]
        for prefix in prefixes:
            if best_path.startswith(prefix): best_path = best_path[len(prefix):]
        if not best_path.startswith("PFA"): best_path = "PFA/" + best_path.lstrip("/")
        best_path = best_path.replace("PFA/PFA/", "PFA/")
        parts = [p.strip() for p in best_path.split("/") if p.strip()]
        if not parts: return None
        current_parent_id, current_full_path = None, ""
        for part in parts:
            current_full_path = f"{current_full_path}/{part}" if current_full_path else part
            query = select(LocationNode).filter(LocationNode.name == part, LocationNode.parent_id == current_parent_id)
            res = await db.execute(query)
            node = res.scalar_one_or_none()
            if not node:
                try:
                    node = LocationNode(name=part, path=current_full_path, parent_id=current_parent_id)
                    db.add(node)
                    await db.flush() 
                except Exception:
                    await db.rollback()
                    res = await db.execute(query)
                    node = res.scalar_one()
            current_parent_id = node.id
        return current_parent_id

location = CRUDLocation()
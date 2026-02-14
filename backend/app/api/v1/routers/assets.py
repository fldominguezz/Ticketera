from typing import List, Optional, Dict, Any, Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Body, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.api.deps import get_db, require_permission, get_current_active_user
from app.schemas.asset import Asset, AssetUpdate, AssetInstallRequest, AssetWithDetails
from sqlalchemy.orm import selectinload
from sqlalchemy.future import select as sa_select
from sqlalchemy import delete, func, and_, or_
from app.crud.crud_asset import asset as crud_asset
from app.crud import crud_audit
from app.db.models.user import User
from app.services.group_service import group_service
from datetime import datetime
import re
router = APIRouter()
class ImportResult(BaseModel):
    success_count: int
    updated_count: int
    error_count: int
    errors: List[Dict[str, Any]]
class BulkActionRequest(BaseModel):
    asset_ids: List[UUID]
    location_node_id: Optional[UUID] = None
    status: Optional[str] = None
    criticality: Optional[str] = None
@router.get(
    "/search", 
    response_model=Dict[str, List[Any]]
)
async def search_inventory(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    search: str = Query(..., min_length=2)
):
    from app.db.models.asset import Asset as AssetModel
    from app.db.models.location import LocationNode
    # Permission Check - Permite búsqueda si tiene permisos de lectura
    has_global = current_user.has_permission("assets:read:global")
    has_group = current_user.has_permission("assets:read:group")
    if not has_global and not has_group:
        raise HTTPException(status_code=403, detail="No tienes permiso para buscar activos.")
    search_filter = f"%{search}%"
    # 1. Búsqueda de Activos (Assets)
    query_assets = sa_select(AssetModel, LocationNode.name.label("loc_name")).outerjoin(
        LocationNode, AssetModel.location_node_id == LocationNode.id
    ).filter(
        and_(
            AssetModel.deleted_at == None,
            or_(
                AssetModel.hostname.ilike(search_filter),
                AssetModel.ip_address.ilike(search_filter),
                AssetModel.mac_address.ilike(search_filter),
                AssetModel.codigo_dependencia.ilike(search_filter)
            )
        )
    )
    # Si no es superuser y no tiene permiso global, limitamos a su grupo/jerarquía
    if not current_user.is_superuser and not has_global and has_group:
        # Aquí se podría filtrar por ubicación si fuera necesario, 
        # pero para vinculación de tickets suele ser global.
        pass
    result_assets = await db.execute(query_assets.limit(15))
    assets_out = []
    for row in result_assets.all():
        a = row[0]
        assets_out.append({
            "id": str(a.id),
            "type": "asset",
            "hostname": a.hostname,
            "ip_address": a.ip_address or "---",
            "mac_address": a.mac_address or "---",
            "location_name": row.loc_name or "Sin Ubicación",
            "status": a.status
        })
    return {"assets": assets_out, "locations": []}
@router.post(
    "/bulk-action"
)
async def bulk_action(
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    action_in: BulkActionRequest,
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    from app.db.models.asset import Asset as AssetModel
    from app.db.models.location import LocationNode
    from app.db.models.asset_history import AssetLocationHistory, AssetEventLog
    # Permission Check
    has_global_manage = current_user.has_permission("assets:manage:global")
    has_group_manage = current_user.has_permission("assets:manage:group")
    if not has_global_manage and not has_group_manage:
        raise HTTPException(status_code=403, detail="No tienes permiso para gestionar activos.")
    if not action_in.asset_ids:
        return {"status": "ok", "message": "No assets selected"}
    query = sa_select(AssetModel).options(selectinload(AssetModel.location)).where(AssetModel.id.in_(action_in.asset_ids))
    result = await db.execute(query)
    assets = result.scalars().all()
    if len(assets) != len(action_in.asset_ids) and not has_global_manage:
         raise HTTPException(status_code=403, detail="No tienes permiso sobre algunos de los activos seleccionados.")
    target_loc_name = "Desconocida"
    if action_in.location_node_id:
        loc_res = await db.execute(sa_select(LocationNode).where(LocationNode.id == action_in.location_node_id))
        loc_obj = loc_res.scalar_one_or_none()
        if loc_obj:
            target_loc_name = loc_obj.name
    for a in assets:
        if action_in.location_node_id:
            if a.location_node_id != action_in.location_node_id:
                prev_name = a.location.name if a.location else "Sin Ubicación"
                # 1. Historial de Ubicacion (Estructural)
                history = AssetLocationHistory(
                    asset_id=a.id,
                    previous_location_id=a.location_node_id,
                    new_location_id=action_in.location_node_id,
                    changed_by_user_id=current_user.id,
                    reason="Bulk Move"
                )
                db.add(history)
                # 2. Log de Evento (Descriptivo para el usuario)
                event = AssetEventLog(
                    asset_id=a.id,
                    event_type="move",
                    description=f"Equipo movido de [{prev_name}] a [{target_loc_name}] por {current_user.username}",
                    user_id=current_user.id,
                    details={"from": prev_name, "to": target_loc_name}
                )
                db.add(event)
                a.location_node_id = action_in.location_node_id
        if action_in.status:
            if a.status != action_in.status:
                event = AssetEventLog(
                    asset_id=a.id,
                    event_type="status_change",
                    description=f"Estado cambiado a {action_in.status} por {current_user.username}",
                    user_id=current_user.id
                )
                db.add(event)
                a.status = action_in.status
        if action_in.criticality:
            a.criticality = action_in.criticality
        db.add(a)
    await db.commit()
    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="assets_bulk_updated",
        ip_address=None,
        details={"count": len(assets)}
    )
    return {"status": "ok", "updated_count": len(assets)}
@router.delete(
    "/bulk-delete"
)
async def bulk_delete(
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    asset_ids: List[UUID] = Body(...),
    hard: bool = Query(False),
    current_user: Annotated[User, Depends(require_permission("assets:delete"))]
):
    from app.db.models.asset import Asset as AssetModel
    if hard:
        query = delete(AssetModel).where(AssetModel.id.in_(asset_ids))
        await db.execute(query) # Use await with execute
    else:
        # Soft delete
        query = sa_select(AssetModel).where(AssetModel.id.in_(asset_ids))
        res_db = await db.execute(query)
        assets = res_db.scalars().all()
        for a in assets:
            a.deleted_at = func.now()
            a.status = "decommissioned"
            db.add(a)
    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="assets_bulk_deleted",
        ip_address=None,
        details={"count": len(asset_ids)}
    )
    await db.commit()
    return {"status": "ok", "deleted_count": len(asset_ids)}
class AssetsPaginated(BaseModel):
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int
@router.get(
    "", 
    response_model=AssetsPaginated
)
async def read_assets(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    page: int = 1,
    size: int = 20,
    location_node_id: Optional[UUID] = None,
    show_decommissioned: bool = Query(False),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    device_type: Optional[str] = Query(None),
    av_product: Optional[str] = Query(None)
):
    from app.db.models.asset import Asset as AssetModel
    from app.db.models.location import LocationNode
    # 1. Validar Permisos
    has_global = current_user.has_permission("assets:read:global")
    has_group = current_user.has_permission("assets:read:group")
    if not has_global and not has_group:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver activos.")
    skip = (page - 1) * size
    query = sa_select(AssetModel, LocationNode.name.label("loc_name"), LocationNode.dependency_code.label("dep_code")).outerjoin(
        LocationNode, AssetModel.location_node_id == LocationNode.id
    ).filter(AssetModel.deleted_at == None)
    if location_node_id:
        query = query.filter(AssetModel.location_node_id == location_node_id)
    if not show_decommissioned:
        query = query.filter(AssetModel.status != "decommissioned")
    if status:
        query = query.filter(AssetModel.status == status)
    if device_type:
        query = query.filter(AssetModel.device_type == device_type)
    if av_product:
        query = query.filter(AssetModel.av_product == av_product)
    if search:
        if search.startswith("#"):
            # Búsqueda específica por Código de Dependencia
            code_search = search[1:].strip()
            query = query.filter(
                (AssetModel.codigo_dependencia.ilike(f"%{code_search}%")) |
                (LocationNode.dependency_code.ilike(f"%{code_search}%"))
            )
        else:
            # Búsqueda general (sin incluir código de dependencia para evitar ruido con IPs)
            search_filter = f"%{search}%"
            query = query.filter(
                (AssetModel.hostname.ilike(search_filter)) |
                (AssetModel.ip_address.ilike(search_filter)) |
                (AssetModel.mac_address.ilike(search_filter)) |
                (AssetModel.dependencia.ilike(search_filter)) |
                (AssetModel.serial.ilike(search_filter)) |
                (LocationNode.name.ilike(search_filter))
            )
    # Count total
    total_query = sa_select(func.count()).select_from(query.subquery())
    total_res = await db.execute(total_query)
    total = total_res.scalar_one()
    result = await db.execute(query.order_by(AssetModel.hostname.asc()).offset(skip).limit(size))
    rows = result.all()
    import math
    assets_list = []
    for row in rows:
        a = row[0]
        assets_list.append({
            "id": str(a.id), 
            "hostname": a.hostname, 
            "ip_address": a.ip_address or "---",
            "mac_address": a.mac_address or "---", 
            "status": a.status,
            "dependencia": a.dependencia,
            "codigo_dependencia": row.dep_code or a.codigo_dependencia or "---",
            "criticality": a.criticality or "medium", 
            "av_product": a.av_product or "AV FREE",
            "location_name": row.loc_name or "Sin Ubicación",
            "os_name": a.os_name or "Desconocido", 
            "os_version": a.os_version or "---", 
            "last_seen": str(a.last_seen) if a.last_seen else None
        })
    return {
        "items": assets_list,
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if total > 0 else 0
    }
@router.get(
    "/{asset_id}", 
    response_model=Any
)
async def read_asset(
    asset_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    from app.db.models.asset import Asset as AssetModel
    from app.db.models.user import User as UserModel
    from app.db.models.location import LocationNode
    from app.db.models.asset_history import AssetEventLog
    from sqlalchemy.orm import selectinload
    # Cargar el activo con TODAS sus relaciones
    query = sa_select(AssetModel).options(
        selectinload(AssetModel.location),
        selectinload(AssetModel.responsible_user),
        selectinload(AssetModel.expedientes),
        selectinload(AssetModel.install_records),
        selectinload(AssetModel.location_history),
        selectinload(AssetModel.ip_history),
        selectinload(AssetModel.event_logs).selectinload(AssetEventLog.user)
    ).where(AssetModel.id == asset_id)
    result = await db.execute(query)
    asset = result.scalar_one_or_none()
    if not asset: 
        raise HTTPException(status_code=404, detail="Asset not found")
    # Devolvemos un dict limpio para evitar errores de serialización de Pydantic
    return {
        "id": str(asset.id),
        "hostname": asset.hostname,
        "serial": asset.serial or "N/A",
        "asset_tag": asset.asset_tag or "N/A",
        "mac_address": asset.mac_address or "---",
        "ip_address": asset.ip_address or "---",
        "status": asset.status or "operative",
        "criticality": asset.criticality or "medium",
        "av_product": asset.av_product or "Sin Protección",
        "device_type": asset.device_type or "device",
        "os_name": asset.os_name or "Desconocido",
        "os_version": asset.os_version or "---",
        "last_seen": asset.last_seen.isoformat() if asset.last_seen else None,
        "dependencia": asset.dependencia,
        "codigo_dependencia": asset.codigo_dependencia,
        "location": {
            "id": str(asset.location.id),
            "name": asset.location.name,
            "dependency_code": asset.location.dependency_code
        } if asset.location else None,
        "responsible_user": {
            "id": str(asset.responsible_user.id),
            "username": asset.responsible_user.username,
            "first_name": asset.responsible_user.first_name,
            "last_name": asset.responsible_user.last_name
        } if asset.responsible_user else None,
        "expedientes": [
            {"id": str(e.id), "number": e.number, "title": e.title} for e in asset.expedientes
        ],
        "install_records": [
            {
                "id": str(r.id), 
                "gde_number": r.gde_number, 
                "tecnico_instalacion": r.tecnico_instalacion,
                "tecnico_carga": r.tecnico_carga,
                "observations": r.observations,
                "created_at": r.created_at.isoformat()
            } for r in sorted(asset.install_records, key=lambda x: x.created_at, reverse=True)
        ],
        "location_history": [
            {
                "id": str(h.id),
                "reason": h.reason,
                "created_at": h.created_at.isoformat()
            } for h in asset.location_history
        ],
        "ip_history": [
            {
                "id": str(i.id),
                "ip_address": i.ip_address,
                "assigned_at": i.assigned_at.isoformat()
            } for i in asset.ip_history
        ],
        "event_logs": [
            {
                "id": str(l.id),
                "event_type": l.event_type,
                "description": l.description,
                "created_at": l.created_at.isoformat(),
                "user": {
                    "first_name": l.user.first_name,
                    "last_name": l.user.last_name
                } if l.user else None
            } for l in sorted(asset.event_logs, key=lambda x: x.created_at, reverse=True)
        ]
    }
@router.post(
    "/import", 
    response_model=ImportResult
)
async def import_assets(
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    assets_in: List[Dict[str, Any]] = Body(...),
    source: str = Query("auto", description="Source system: 'fortiems', 'eset', or 'auto'"),
    current_user: Annotated[User, Depends(require_permission("assets:import"))]
):
    from app.services.asset_import_service import process_fortiems_import, process_eset_import, ImportResult as SrvImportResult
    from app.db.models.asset import Asset as AssetModel
    from app.crud.crud_location import location as crud_location
    if not assets_in:
        return ImportResult(success_count=0, updated_count=0, error_count=0, errors=[])
    # 1. Auto-detection logic if needed
    if source == "auto":
        # Check first item to guess
        first_keys = {str(k).lower().strip().lstrip('\ufeff') for k in assets_in[0].keys()}
        if "group_paths" in first_keys:
            source = "fortiems"
        elif "grupo" in first_keys and "usuarios registrados" in first_keys:
            source = "eset"
        else:
            source = "manual"
    # 2. Dispatch to service
    if source == "fortiems":
        res_obj = await process_fortiems_import(db, assets_in)
        return res_obj.dict()
    elif source == "eset":
        res_obj = await process_eset_import(db, assets_in)
        return res_obj.dict()
    # 3. Fallback / Manual Logic (Preserved/Simplified here for non-specific imports)
    res = ImportResult(success_count=0, updated_count=0, error_count=0, errors=[])
    manual_loc_id = await crud_location.get_or_create_by_path(db, "PFA/Importaciones Manuales")
    for idx, raw_item in enumerate(assets_in):
        try:
            item = {str(k).lower().strip(): str(v).strip() for k, v in raw_item.items()}
            hostname = item.get("host") or item.get("name") or item.get("nombre") or item.get("hostname")
            if not hostname: continue
            ip = item.get("ip_addr") or item.get("ip_address") or item.get("direcciones ip")
            if ip: ip = str(ip).split(",")[0].strip()
            query_asset = sa_select(AssetModel).filter(and_(AssetModel.hostname == hostname, AssetModel.ip_address == (ip if ip else None)))
            asset_db = await db.execute(query_asset)
            existing_asset = asset_db.scalar_one_or_none()
            if existing_asset:
                existing_asset.last_seen = datetime.now()
                # Update basic fields if provided
                if item.get("os"): existing_asset.os_name = item.get("os")
                res.updated_count += 1
            else:
                new_asset = AssetModel(
                    hostname=hostname,
                    ip_address=ip,
                    location_node_id=manual_loc_id,
                    status="operative",
                    av_product="AV FREE",
                    last_seen=datetime.now()
                )
                db.add(new_asset)
                res.success_count += 1
            if (res.success_count + res.updated_count) % 50 == 0: await db.flush()
        except Exception as e:
            res.error_count += 1
            res.errors.append({"row": idx + 1, "msg": str(e)})
    await db.commit()
    return res
@router.post(
    "/install", 
    response_model=Any
)
async def install_asset(
    *,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    request_payload: AssetInstallRequest,
    current_user: Annotated[User, Depends(require_permission("assets:install"))]
):
    asset = await crud_asset.process_installation(db, asset_data=request_payload.asset_data, install_data=request_payload.install_data, user_id=current_user.id)
    # Registro de Auditoría
    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="asset_installed",
        ip_address=request.client.host,
        details={
            "asset_id": str(asset.id),
            "hostname": asset.hostname,
            "gde_number": request_payload.install_data.gde_number,
            "status": asset.status
        }
    )
    return {"status": "ok", "id": str(asset.id)}
@router.post("/{asset_id}/expedientes")
async def link_expediente_to_asset(
    asset_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    expediente_in: Any = Body(...)
):
    # Permission Check
    has_global_manage = current_user.has_permission("assets:manage:global")
    has_group_manage = current_user.has_permission("assets:manage:group")
    if not has_global_manage and not has_group_manage:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar activos.")
    from app.db.models.asset import Asset as AssetModel
    from app.db.models.expediente import Expediente
    from app.crud import crud_expediente
    from app.schemas.expediente import ExpedienteCreate
    # Cargar el activo con la relación expedientes ya disponible
    query_asset = sa_select(AssetModel).options(selectinload(AssetModel.expedientes)).where(AssetModel.id == asset_id)
    res_asset = await db.execute(query_asset)
    asset_obj = res_asset.scalar_one_or_none()
    if not asset_obj:
        raise HTTPException(status_code=404, detail="Asset not found")
    # Scope Check
    if not has_global_manage and has_group_manage:
        if not current_user.group_id:
             raise HTTPException(status_code=403, detail="Fuera de jerarquía")
        group_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
        if asset_obj.owner_group_id not in group_ids:
            raise HTTPException(status_code=403, detail="No tienes permiso sobre este activo (Grupo).")
    gde_number = expediente_in.get("number")
    if not gde_number:
        raise HTTPException(status_code=400, detail="GDE number is required")
    # Buscar o crear expediente
    res_exp = await db.execute(sa_select(Expediente).where(Expediente.number == gde_number))
    expediente_obj = res_exp.scalar_one_or_none()
    if not expediente_obj:
        expediente_obj = await crud_expediente.expediente.create(db, obj_in=ExpedienteCreate(
            number=gde_number,
            title=expediente_in.get("title") or "Vinculación Manual",
            description=f"Vinculado a {asset_obj.hostname} por {current_user.username}"
        ))
    # Evitar duplicados en la relación
    if expediente_obj not in asset_obj.expedientes:
        asset_obj.expedientes.append(expediente_obj)
        # Log de Evento: Expediente vinculado
        from app.db.models.asset_history import AssetEventLog
        event = AssetEventLog(
            asset_id=asset_obj.id,
            event_type="expediente_linked",
            description=f"Vinculado expediente {gde_number}",
            user_id=current_user.id,
            details={"gde": gde_number, "title": expediente_in.get("title")}
        )
        db.add(event)
        await db.commit()
    return {"status": "ok"}
@router.delete(
    "/{asset_id}"
)
async def delete_asset(
    asset_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    # Permission Check
    has_global_manage = current_user.has_permission("assets:manage:global") or current_user.has_permission("assets:delete")
    has_group_manage = current_user.has_permission("assets:manage:group")
    if not has_global_manage and not has_group_manage:
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar activos.")
    asset_obj = await crud_asset.get(db, id=asset_id)
    if not asset_obj: raise HTTPException(status_code=404, detail="Asset not found")
    # Eliminamos Scope Check por grupo
    await crud_asset.remove(db, id=asset_id)
    return {"status": "success"}
@router.put(
    "/{asset_id}", 
    response_model=Any
)
async def update_asset(
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    asset_id: UUID,
    asset_in: AssetUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    # Permission Check
    has_global_manage = current_user.has_permission("assets:manage:global")
    has_group_manage = current_user.has_permission("assets:manage:group")
    if not has_global_manage and not has_group_manage:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar activos.")
    asset_obj = await crud_asset.get(db, id=asset_id)
    if not asset_obj: raise HTTPException(status_code=404, detail="Asset not found")
    # Eliminamos Scope Check por grupo
    return await crud_asset.update(db, db_obj=asset_obj, obj_in=asset_in, user_id=current_user.id)
from typing import Annotated, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body, Request # Added Request for consistency, though not used in original
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, require_permission, require_role # Updated imports
from app.db.models.user import User # Added User import
from app.db.models.asset import Asset as AssetModel
from app.db.models.location import LocationNode
from app.crud.crud_location import location as crud_location
from datetime import datetime
import re
import traceback

router = APIRouter()

@router.post(
    "/import",
    dependencies=[Depends(require_role(['owner', 'admin']))] # Restrict to owner/admin roles
)
async def import_assets(
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    assets_in: List[dict] = Body(...),
    current_user: Annotated[User, Depends(require_permission("assets:import"))] # Requires specific permission
):
    """
    Import assets from EMS/ESET.
    """
    
    stats = {"created": 0, "updated": 0, "errors": 0}

    def clean_mac(mac):
        if not mac: return None
        cleaned = re.sub(r'[^a-fA-F0-9]', '', str(mac)).lower()
        if len(cleaned) != 12: return str(mac).lower()
        return ":".join(cleaned[i:i+2] for i in range(0, 12, 2))

    for item in assets_in:
        try:
            # 1. Normalización de llaves (insensible a mayúsculas/espacios)
            item_low = {str(k).lower().strip(): v for k, v in item.items()}
            
            # 2. Detectar si es ESET
            source = item_low.get("source", "ems")
            is_eset = source == "eset" or any(k in item_low for k in ["usuarios registrados", "direcciones ip", "nombre del sistema operativo"])
            
            if is_eset:
                source = "eset"
                raw_name = str(item_low.get("nombre") or item_low.get("fqdn") or item_low.get("name") or "").strip()
                ip = str(item_low.get("direcciones ip") or item_low.get("ip_addr") or "").strip()
                os_ver = str(item_low.get("versión de sistema operativo") or item_low.get("os_version") or "").strip()
                os_name = str(item_low.get("nombre del sistema operativo") or item_low.get("os_name") or "").strip()
                path_str = str(item_low.get("grupo") or item_low.get("group_paths") or "").strip()
                operator = str(item_low.get("usuarios registrados") or item_low.get("operator") or "").strip()
                mac = clean_mac(item_low.get("dirección mac") or item_low.get("mac_addr"))
                
                av_product_final = "ESET CLOUD"
                source_system_final = "ESET"
                observations_final = f"Operador: {operator}" if operator else ""
                
                # Simplificar OS
                if os_ver and "." in os_ver: os_ver = os_ver.split('.')[0]
                
                # Resolución de carpeta ESET
                location_id = None
                group_name = path_str.strip('/')
                if group_name:
                    query_loc = sa_select(LocationNode).filter(
                        LocationNode.name == group_name,
                        LocationNode.path.like("PFA/ESET CLOUD/%")
                    )
                    loc_res = await db.execute(query_loc)
                    existing_loc = loc_res.scalar_one_or_none()
                    if existing_loc:
                        location_id = existing_loc.id
                        path_str = existing_loc.path
                    else:
                        path_str = f"PFA/ESET CLOUD/{group_name}"
                else:
                    path_str = "PFA/ESET CLOUD/Perdidos y Encontrados (ESET)"
            else:
                # Lógica EMS
                source = "ems"
                raw_name = str(item_low.get("name") or "").strip()
                ip = str(item_low.get("ip_addr") or "").strip()
                os_ver = str(item_low.get("os_version") or "").strip()
                os_name = str(item_low.get("os_name") or "").strip()
                path_str = str(item_low.get("group_paths") or "").strip()
                mac = clean_mac(item_low.get("mac_addr"))
                av_product_final = "FortiClient EMS"
                source_system_final = "FortiSIEM"
                observations_final = ""
                if not path_str: path_str = "PFA/FORTIEMS/Perdidos y Encontrados (EMS)"
                elif not path_str.startswith("PFA/"): path_str = f"PFA/FORTIEMS/{path_str}"

                location_id = None

            # 3. Hostname final
            hostname_final = raw_name or f"Device-{mac or 'Unknown'}"
            if hostname_final == "Device-Unknown" and ip: hostname_final = f"ESET-{ip}"
            
            # 4. Asegurar location_id
            if not location_id:
                location_id = await crud_location.get_or_create_by_path(db, path_str)
            
            # 5. Estado
            status_final = "operative"
            if "Perdidos y Encontrados" in path_str or "Lost And Found" in path_str:
                status_final = "tagging_pending"

            # 6. Guardar en DB
            # Buscar duplicado por MAC o Hostname
            existing = None
            if mac and len(mac) > 5:
                res = await db.execute(sa_select(AssetModel).filter(AssetModel.mac_address == mac))
                existing = res.scalar_one_or_none()
            
            if not existing and hostname_final:
                res = await db.execute(sa_select(AssetModel).filter(AssetModel.hostname == hostname_final))
                existing = res.scalar_one_or_none()
            
            if existing:
                existing.hostname = hostname_final
                existing.ip_address = ip or existing.ip_address
                existing.os_name = os_name or existing.os_name
                existing.os_version = os_ver or existing.os_version
                existing.av_product = av_product_final
                existing.location_node_id = location_id
                existing.status = status_final
                existing.observations = observations_final or existing.observations
                existing.last_seen = datetime.now()
                stats["updated"] += 1
            else:
                new_asset = AssetModel(
                    hostname=hostname_final, ip_address=ip, mac_address=mac,
                    os_name=os_name, os_version=os_ver, av_product=av_product_final,
                    location_node_id=location_id, source_system="Manual",
                    status=status_final, observations=observations_final,
                    last_seen=datetime.now()
                )
                db.add(new_asset)
                stats["created"] += 1

            if (stats["created"] + stats["updated"]) % 50 == 0:
                await db.flush()

        except Exception as e:
            traceback.print_exc()
            stats["errors"] += 1
            
    await db.commit()
    return stats
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select as sa_select
from sqlalchemy import and_, func
from app.db.models.asset import Asset as AssetModel
from app.db.models.location import LocationNode
from app.crud.crud_location import location as crud_location
from datetime import datetime
import re

class ImportResult:
    def __init__(self):
        self.success_count = 0
        self.updated_count = 0
        self.error_count = 0
        self.errors = []

    def dict(self):
        return {
            "success_count": self.success_count,
            "updated_count": self.updated_count,
            "error_count": self.error_count,
            "errors": self.errors
        }

async def process_fortiems_import(db: AsyncSession, assets_data: List[Dict[str, Any]]) -> ImportResult:
    res = ImportResult()
    if assets_data:
        print(f"DEBUG SERVICE FORTIEMS: First item keys: {list(assets_data[0].keys())}")
    
    for idx, raw_item in enumerate(assets_data):
        try:
            # Normalize keys
            item = {str(k).lower().strip().lstrip('\ufeff'): str(v).strip() for k, v in raw_item.items()}
            
            # --- FALLBACK: Fix frontend CSV parsing failure (Semicolons) ---
            if len(item) == 1:
                single_key = list(item.keys())[0]
                if ';' in single_key:
                    headers = single_key.split(';')
                    values = str(item[single_key]).split(';')
                    while len(values) < len(headers): values.append("")
                    item = {h.strip(): v.strip() for h, v in zip(headers, values)}
            # ---------------------------------------------------------------

            # Map Hostname
            hostname = item.get("host") or item.get("name")
            if not hostname:
                continue
            hostname = re.split(r'[;,]', str(hostname))[0].strip()

            # Map IP
            ip_raw = item.get("ip_addr", "")
            ip = str(ip_raw).split(",")[0].split(";")[0].strip()

            # Map Path (Hierarchy)
            raw_path = item.get("group_paths", "")
            if raw_path.startswith("All Groups"):
                clean_path = raw_path.replace("All Groups", "PFA/FORTIEMS", 1)
            else:
                clean_path = f"PFA/FORTIEMS/{raw_path.strip('/')}" if raw_path else "PFA/FORTIEMS/Perdidos y Encontrados"
            
            clean_path = clean_path.replace("\\", "/").replace("//", "/")
            location_id = await crud_location.get_or_create_by_path(db, clean_path)

            # Upsert
            await _upsert_asset(
                db=db,
                hostname=hostname,
                ip=ip,
                mac=item.get("mac_addr", ""),
                os_info=item.get("os_version", ""),
                location_id=location_id,
                source_system="FortiEMS",
                av_product="FortiClient EMS",
                res=res
            )
            
            if (res.success_count + res.updated_count) % 50 == 0:
                await db.flush()

        except Exception as e:
            res.error_count += 1
            res.errors.append({"row": idx + 1, "msg": str(e)})

    await db.commit()
    return res

async def process_eset_import(db: AsyncSession, assets_data: List[Dict[str, Any]]) -> ImportResult:
    res = ImportResult()
    if assets_data:
        print(f"DEBUG SERVICE ESET: Received {len(assets_data)} items. First item keys: {list(assets_data[0].keys())}")
    
    for idx, raw_item in enumerate(assets_data):
        try:
            # Normalize keys
            item = {str(k).lower().strip().lstrip('\ufeff'): str(v).strip() for k, v in raw_item.items()}

            # --- FALLBACK: Fix frontend CSV parsing failure (Semicolons) ---
            if len(item) == 1:
                single_key = list(item.keys())[0]
                if ';' in single_key:
                    # Frontend sent {"col1;col2": "val1;val2"}
                    headers = single_key.split(';')
                    single_value = item[single_key]
                    # We need to split the value strictly. 
                    # Warning: simple split(';') might break if values contain quoted semicolons.
                    # But since frontend likely failed because it didn't handle quotes/delimiter properly, we assume simple split here.
                    values = single_value.split(';')
                    
                    if len(headers) == len(values):
                        item = {h.strip(): v.strip() for h, v in zip(headers, values)}
                    else:
                        # Values length mismatch (maybe empty trailing columns), try to map as much as possible
                        # or pad values
                        while len(values) < len(headers):
                            values.append("")
                        item = {h.strip(): v.strip() for h, v in zip(headers, values)}
            # ---------------------------------------------------------------

            # Map Hostname (More robust check)
            hostname = item.get("nombre") or item.get("name") or item.get("host")
            if not hostname or str(hostname).lower() in ["nombre", "name", "host", ""]:
                continue
            hostname = re.split(r'[;,]', str(hostname))[0].strip()

            # Map IP
            ip_raw = item.get("direcciones ip", "")
            ip = str(ip_raw).split(",")[0].split(";")[0].strip()

            # Map Path
            group_name = item.get("grupo", "").strip()
            location_id = None
            
            if group_name:
                # Clean group name for matching (e.g. "Name (Code)" -> "Name")
                match_name = re.sub(r'\s*\(.*\)\s*$', '', group_name).strip()
                
                # Check if group exists under ESET root (case-insensitive)
                query_loc = sa_select(LocationNode).filter(
                    (LocationNode.name.ilike(group_name)) | (LocationNode.name.ilike(match_name)),
                    LocationNode.path.like("PFA/ESET CLOUD/%")
                ).order_by(func.length(LocationNode.path).desc())
                
                loc_db = await db.execute(query_loc)
                existing_loc = loc_db.scalars().first()
                
                if existing_loc:
                    location_id = existing_loc.id
                else:
                    print(f"DEBUG ESET IMPORT: Group not found in DB: '{group_name}' (tried '{match_name}')")
            
            # If not found or group_name empty, use Lost and Found
            if not location_id:
                query_lost = sa_select(LocationNode).filter(
                    LocationNode.path == "PFA/ESET CLOUD/Perdidos y Encontrados"
                )
                lost_db = await db.execute(query_lost)
                lost_loc = lost_db.scalar_one_or_none()
                if lost_loc:
                    location_id = lost_loc.id
                else:
                    # Absolute fallback (should not happen as we just created it)
                    location_id = await crud_location.get_or_create_by_path(db, "PFA/ESET CLOUD/Perdidos y Encontrados")

            # Combine OS info
            os_name = item.get("nombre del sistema operativo", "")
            os_ver = item.get("versión de sistema operativo", "")
            os_full = f"{os_name} {os_ver}".strip()

            # Upsert
            await _upsert_asset(
                db=db,
                hostname=hostname,
                ip=ip,
                mac="", # ESET csv doesn't seem to have MAC in the provided columns, or it wasn't listed
                os_info=os_full,
                location_id=location_id,
                source_system="ESET",
                av_product="ESET CLOUD",
                res=res
            )

            if (res.success_count + res.updated_count) % 50 == 0:
                await db.flush()

        except Exception as e:
            res.error_count += 1
            res.errors.append({"row": idx + 1, "msg": str(e)})

    await db.commit()
    return res

async def _upsert_asset(db: AsyncSession, hostname: str, ip: str, mac: str, os_info: str, location_id, source_system: str, av_product: str, res: ImportResult):
    # Upsert Logic: Match by Hostname AND IP (if IP exists), otherwise just Hostname? 
    # Convention seems to be Hostname + IP in the previous code.
    
    query_asset = sa_select(AssetModel).filter(
        and_(
            AssetModel.hostname == hostname, 
            AssetModel.ip_address == (ip if ip else None)
        )
    )
    asset_db = await db.execute(query_asset)
    existing_asset = asset_db.scalar_one_or_none()

    if existing_asset:
        existing_asset.location_node_id = location_id
        existing_asset.av_product = av_product
        existing_asset.source_system = source_system
        existing_asset.last_seen = datetime.now()
        # Optionally update OS/Mac if provided and missing
        if mac and not existing_asset.mac_address:
            existing_asset.mac_address = mac[:50]
        if os_info:
            existing_asset.os_name = os_info[:100]
            
        res.updated_count += 1
    else:
        new_asset = AssetModel(
            hostname=hostname[:255], 
            ip_address=ip[:50] if ip else None,
            mac_address=mac[:50],
            os_name=os_info[:100],
            location_node_id=location_id, 
            status="operative",
            source_system=source_system,
            av_product=av_product,
            last_seen=datetime.now()
        )
        db.add(new_asset)
        res.success_count += 1

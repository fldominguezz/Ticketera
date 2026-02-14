import asyncio
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select as sa_select
from sqlalchemy import and_, func
from app.db.models.asset import Asset as AssetModel
from datetime import datetime
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
# Helper to extract name and code from a string
# Example: "Sección Sala de Situación (cod. 548)" -> ("Sección Sala de Situación", "548")
def extract_dep_and_code(text: str):
    if not text:
        return None, None
    # Take the last part of a path if it's a path
    name = text.split('/')[-1].split('\\')[-1].strip()
    pattern = re.compile(r'^(.*?)\s*\(? (?:cod\.?|Cód\.?|Cod:?|Cód:?|CÓD\.?)\s*(\d+)\)?\s*$', re.IGNORECASE)
    match = pattern.search(name)
    if match:
        return match.group(1).strip(), match.group(2).strip()
    return name, None
async def process_fortiems_import(db: AsyncSession, assets_data: List[Dict[str, Any]]) -> ImportResult:
    res = ImportResult()
    for idx, raw_item in enumerate(assets_data):
        try:
            item = {str(k).lower().strip().lstrip('\ufeff'): str(v).strip() for k, v in raw_item.items()}
            # Fallback for semicolon separated values
            if len(item) == 1:
                single_key = list(item.keys())[0]
                if ';' in single_key:
                    headers = single_key.split(';')
                    values = str(item[single_key]).split(';')
                    while len(values) < len(headers): values.append("")
                    item = {h.strip(): v.strip() for h, v in zip(headers, values)}
            hostname = item.get("host") or item.get("name")
            if not hostname: continue
            hostname = re.split(r'[;,]', str(hostname))[0].strip()
            ip_raw = item.get("ip_addr", "")
            ip = str(ip_raw).split(",")[0].split(";")[0].strip()
            raw_path = item.get("group_paths", "")
            dep, code = extract_dep_and_code(raw_path)
            await _upsert_asset(
                db=db,
                hostname=hostname,
                ip=ip,
                mac=item.get("mac_addr", ""),
                os_info=item.get("os_version", ""),
                dependencia=dep,
                codigo_dependencia=code,
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
    for idx, raw_item in enumerate(assets_data):
        try:
            item = {str(k).lower().strip().lstrip('\ufeff'): str(v).strip() for k, v in raw_item.items()}
            if len(item) == 1:
                single_key = list(item.keys())[0]
                if ';' in single_key:
                    headers = single_key.split(';')
                    values = item[single_key].split(';')
                    while len(values) < len(headers): values.append("")
                    item = {h.strip(): v.strip() for h, v in zip(headers, values)}
            hostname = item.get("nombre") or item.get("name") or item.get("host")
            if not hostname or str(hostname).lower() in ["nombre", "name", "host", ""]:
                continue
            hostname = re.split(r'[;,]', str(hostname))[0].strip()
            ip_raw = item.get("direcciones ip", "")
            ip = str(ip_raw).split(",")[0].split(";")[0].strip()
            group_name = item.get("grupo", "").strip()
            dep, code = extract_dep_and_code(group_name)
            os_name = item.get("nombre del sistema operativo", "")
            os_ver = item.get("versión de sistema operativo", "")
            os_full = f"{os_name} {os_ver}".strip()
            await _upsert_asset(
                db=db,
                hostname=hostname,
                ip=ip,
                mac="",
                os_info=os_full,
                dependencia=dep,
                codigo_dependencia=code,
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
async def _upsert_asset(db: AsyncSession, hostname: str, ip: str, mac: str, os_info: str, dependencia: str, codigo_dependencia: str, source_system: str, av_product: str, res: ImportResult):
    query_asset = sa_select(AssetModel).filter(
        and_(
            AssetModel.hostname == hostname, 
            AssetModel.ip_address == (ip if ip else None)
        )
    )
    asset_db = await db.execute(query_asset)
    existing_asset = asset_db.scalar_one_or_none()
    if existing_asset:
        existing_asset.dependencia = dependencia
        existing_asset.codigo_dependencia = codigo_dependencia
        existing_asset.av_product = av_product
        existing_asset.source_system = source_system
        existing_asset.last_seen = datetime.now()
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
            dependencia=dependencia,
            codigo_dependencia=codigo_dependencia,
            status="operative",
            source_system=source_system,
            av_product=av_product,
            last_seen=datetime.now()
        )
        db.add(new_asset)
        res.success_count += 1
import httpx
import os
import logging
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

class VirusTotalService:
    def __init__(self):
        self.api_key = os.getenv("VT_API_KEY")
        self.base_url = "https://www.virustotal.com/api/v3"
        self.headers = {
            "x-apikey": self.api_key,
            "accept": "application/json"
        }

    async def get_cached_result(self, db: AsyncSession, target: str) -> Optional[Dict[str, Any]]:
        """Busca en la caché local (válida por 24hs)"""
        # Nota: Aquí deberíamos tener un modelo de SQLAlchemy, pero para rapidez 
        # usaré ejecución directa vía text si no quiero crear el modelo ahora.
        from sqlalchemy import text
        query = text("SELECT result, scanned_at FROM vt_cache WHERE target = :target")
        res = await db.execute(query, {"target": target})
        row = res.fetchone()
        
        if row:
            scanned_at = row[1]
            if datetime.now(scanned_at.tzinfo) - scanned_at < timedelta(hours=24):
                return row[0]
        return None

    async def save_to_cache(self, db: AsyncSession, target: str, result: Dict[str, Any]):
        from sqlalchemy import text
        positives = result.get("data", {}).get("attributes", {}).get("last_analysis_stats", {}).get("malicious", 0)
        total = sum(result.get("data", {}).get("attributes", {}).get("last_analysis_stats", {}).values()) if "data" in result else 0
        
        query = text("""
            INSERT INTO vt_cache (target, result, positives, total, scanned_at)
            VALUES (:target, :result, :pos, :total, CURRENT_TIMESTAMP)
            ON CONFLICT (target) DO UPDATE SET 
                result = EXCLUDED.result, 
                positives = EXCLUDED.positives,
                total = EXCLUDED.total,
                scanned_at = CURRENT_TIMESTAMP
        """)
        await db.execute(query, {
            "target": target, 
            "result": json.dumps(result),
            "pos": positives,
            "total": total
        })
        await db.commit()

    async def scan_ip(self, db: AsyncSession, ip: str) -> Dict[str, Any]:
        cached = await self.get_cached_result(db, ip)
        if cached: return cached

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{self.base_url}/ip_addresses/{ip}", headers=self.headers)
                if response.status_code == 200:
                    result = response.json()
                    await self.save_to_cache(db, ip, result)
                    return result
                elif response.status_code == 429:
                    return {"error": "API Limit reached", "retry_after": 60}
                else:
                    return {"error": f"VT Error: {response.status_code}"}
            except Exception as e:
                return {"error": str(e)}

    async def scan_hash(self, db: AsyncSession, file_hash: str) -> Dict[str, Any]:
        cached = await self.get_cached_result(db, file_hash)
        if cached: return cached

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{self.base_url}/files/{file_hash}", headers=self.headers)
                if response.status_code == 200:
                    result = response.json()
                    await self.save_to_cache(db, file_hash, result)
                    return result
                elif response.status_code == 404:
                    return {"error": "File not found in VirusTotal database"}
                elif response.status_code == 429:
                    return {"error": "API Limit reached"}
                else:
                    return {"error": f"VT Error: {response.status_code}"}
            except Exception as e:
                return {"error": str(e)}

vt_service = VirusTotalService()

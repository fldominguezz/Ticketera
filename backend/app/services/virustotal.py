from app.utils.security import validate_external_url
from app.utils.security import validate_external_url
import requests
import base64
import time
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class VirusTotalService:
    BASE_URL = "https://www.virustotal.com/api/v3"

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {"x-apikey": api_key}
        self.rate_limit_hit = False

    def _get_url_id(self, url: str) -> str:
        return base64.urlsafe_b64encode(url.encode()).decode().strip("=")

    def check_url(self, url: str) -> Dict[str, Any]:
        url_id = self._get_url_id(url)
        gui_link = f"https://www.virustotal.com/gui/url/{url_id}"
        
        # Si ya chocamos con el límite, no intentamos la API y devolvemos el link directo
        if self.rate_limit_hit:
            return {"scanned": False, "status": "Redirected (Rate Limit)", "link": gui_link}

        endpoint = f"{self.BASE_URL}/urls/{url_id}"
        try:
            validate_external_url(endpoint)
            validate_external_url(endpoint)
            response = requests.get(endpoint, headers=self.headers, timeout=5)
            if response.status_code == 200:
                data = response.json().get("data", {}).get("attributes", {})
                stats = data.get("last_analysis_stats", {})
                return {
                    "scanned": True,
                    "malicious": stats.get("malicious", 0),
                    "suspicious": stats.get("suspicious", 0),
                    "harmless": stats.get("harmless", 0),
                    "link": gui_link
                }
            elif response.status_code == 429:
                self.rate_limit_hit = True
                return {"scanned": False, "status": "Redirected (Rate Limit)", "link": gui_link}
            else:
                return {"scanned": False, "status": f"Info not available", "link": gui_link}
        except Exception:
            return {"scanned": False, "status": "Error", "link": gui_link}

    def check_file_hash(self, file_hash: str) -> Dict[str, Any]:
        gui_link = f"https://www.virustotal.com/gui/file/{file_hash}"
        
        if self.rate_limit_hit:
            return {"scanned": False, "status": "Redirected (Rate Limit)", "link": gui_link}

        endpoint = f"{self.BASE_URL}/files/{file_hash}"
        try:
            validate_external_url(endpoint)
            validate_external_url(endpoint)
            response = requests.get(endpoint, headers=self.headers, timeout=5)
            if response.status_code == 200:
                data = response.json().get("data", {}).get("attributes", {})
                stats = data.get("last_analysis_stats", {})
                return {
                    "scanned": True,
                    "malicious": stats.get("malicious", 0),
                    "suspicious": stats.get("suspicious", 0),
                    "harmless": stats.get("harmless", 0),
                    "link": gui_link
                }
            elif response.status_code == 429:
                self.rate_limit_hit = True
                return {"scanned": False, "status": "Redirected (Rate Limit)", "link": gui_link}
            else:
                return {"scanned": False, "status": "Not found", "link": gui_link}
        except Exception:
            return {"scanned": False, "status": "Error", "link": gui_link}

    def calculate_verdict(self, results: List[Dict]) -> str:
        malicious_count = 0
        suspicious_count = 0
        scanned_count = 0

        for r in results:
            if not r.get("scanned"): continue
            scanned_count += 1
            malicious_count += r.get("malicious", 0)
            suspicious_count += r.get("suspicious", 0)

        if malicious_count > 0: return "MALICIOUS"
        if suspicious_count > 0: return "SUSPICIOUS"
        if scanned_count > 0: return "CLEAN"
        return "UNKNOWN"
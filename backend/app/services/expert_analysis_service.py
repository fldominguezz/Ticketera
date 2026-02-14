from app.utils.security import validate_external_url
from typing import Dict, Any, Optional
import re
import requests
import json
import logging
import os

logger = logging.getLogger(__name__)

class ExpertAnalysisService:
    def __init__(self):
        self.ollama_url = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
        self.model = os.getenv("OLLAMA_MODEL", "llama3.2") 
        
        self.kb = {
            "actions": {
                "alert": "Modo OBSERVACIÓN: Tráfico detectado pero NO bloqueado.",
                "deny": "Modo PROTECCIÓN: Tráfico denegado por el firewall.",
                "block": "Modo PROTECCIÓN: Conexión bloqueada activamente.",
                "blocked": "Modo PROTECCIÓN: Conexión bloqueada activamente.",
                "dropped": "Modo PROTECCIÓN: Paquete descartado silenciosamente.",
                "passed": "Modo PERMISIVO: El tráfico fue permitido."
            }
        }

    def _call_ollama(self, raw_log: str) -> Optional[Dict[str, str]]:
        log_clean = raw_log.strip().lower()
        if len(log_clean) < 10 or log_clean in ["test", "test test", "prueba", "ping"]:
            return {
                "summary": "Prueba de conectividad o log demasiado corto para análisis.",
                "remediation": "No se requiere acción."
            }

        prompt = f"""
        Act as a Senior SOC Analyst and Incident Responder. 
        Analyze this raw security log (Syslog/FortiGate/XML) and provide:
        1. A clear technical summary (WHO is attacking WHOM, WHAT technique is used, is it BLOCKED or ALLOWED?).
        2. Actionable recommendations (Numbered list).

        RAW LOG:
        {raw_log}

        FORMAT RULES:
        - Response MUST be a JSON object with keys "summary" and "recommendation".
        - Language: SPANISH.
        """
        
        try:
            target_url = f"{self.ollama_url}/api/generate"
            validate_external_url(target_url)
            
            res = requests.post(
                target_url,
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "format": "json",
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "num_ctx": 4096
                    }
                },
                timeout=60
            )
            
            if res.status_code == 200:
                response_json = res.json()
                raw_response = response_json.get("response", "{}")
                content = json.loads(raw_response)
                
                summary = content.get("summary", "")
                recommendation = content.get("recommendation", "")

                if isinstance(recommendation, list):
                    recommendation = "\n".join([f"- {str(item)}" for item in recommendation])
                
                if summary and recommendation:
                    return {
                        "summary": summary,
                        "remediation": recommendation
                    }
        except Exception as e:
            logger.warning(f"Ollama Analysis failed: {e}")
        return None

    def _heuristic_analysis(self, raw_log: str) -> Dict[str, str]:
        raw_lower = raw_log.lower()
        summary_parts = []
        recs = ["1. Investigar manualmente los detalles en el Raw Log."]

        src_match = re.search(r'srcip="?([\d\.]+)"?', raw_lower)
        dst_match = re.search(r'dstip="?([\d\.]+)"?', raw_lower)
        host_match = re.search(r'hostname="?([^"\s]+)"?', raw_lower)
        msg_match = re.search(r'msg="?([^"]+)"?', raw_lower)

        if src_match:
            summary_parts.append(f"Origen: {src_match.group(1)}.")
        if host_match:
            summary_parts.append(f"Objetivo: {host_match.group(1)}.")
        elif dst_match:
            summary_parts.append(f"IP Destino: {dst_match.group(1)}.")
        
        if msg_match:
            summary_parts.append(f"Motivo: {msg_match.group(1)}.")

        for act, desc in self.kb["actions"].items():
            if f'action="{act}"' in raw_lower or f'action={act}' in raw_lower:
                summary_parts.append(desc)
                if act in ["blocked", "deny", "block"]:
                    recs.append("2. Validar si el bloqueo es legítimo o un falso positivo por política.")

        if not summary_parts:
            return {
                "summary": "Análisis preliminar: Se detectó actividad en los logs de seguridad que requiere revisión manual.",
                "recommendation": "1. Revisar el Raw Log para identificar el origen y la severidad.\n2. Verificar conectividad desde la IP reportada."
            }

        return {
            "summary": " ".join(summary_parts),
            "recommendation": "\n".join(recs)
        }

    def analyze_raw_log(self, raw_log: str) -> Dict[str, str]:
        if not raw_log:
            return {"summary": "Sin datos.", "recommendation": "N/A"}

        ai_result = self._call_ollama(raw_log)
        if ai_result:
            return ai_result

        return self._heuristic_analysis(raw_log)

expert_analysis_service = ExpertAnalysisService()

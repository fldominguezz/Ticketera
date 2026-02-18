from app.utils.security import validate_external_url
from typing import Dict, Any, Optional
import re
import requests
import json
import logging
import os
import html

logger = logging.getLogger(__name__)

class ExpertAnalysisService:
    def __init__(self):
        self.ollama_url = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
        self.model = os.getenv("OLLAMA_MODEL", "llama3.2:1b") 

    def _clean_log_for_ai(self, raw_log: str) -> str:
        """Limpia y prepara el log técnico completo para el análisis."""
        text = html.unescape(raw_log)
        if "<rawEvents>" in text:
            parts = text.split("<rawEvents>")
            technical = parts[1].split("</rawEvents>")[0]
            text = f"LOGS TÉCNICOS:\n{technical}"
        return text[:2000].strip()

    def _call_ollama(self, raw_log: str) -> Optional[Dict[str, str]]:
        log_clean = self._clean_log_for_ai(raw_log)
        if len(log_clean) < 15:
            return None

        prompt = f"""
        ERES UN ANALISTA SOC QUE EXPLICA INCIDENTES A PERSONAL NO TÉCNICO.
        Analiza este log de seguridad y explica qué pasó de forma que CUALQUIERA lo entienda.
        
        LOG TÉCNICO:
        {log_clean}
        
        INSTRUCCIONES PARA TU RESPUESTA:
        1. Comienza con: "La alerta se dio porque..." (Explica el motivo técnico en lenguaje simple, mencionando la IP de origen y qué estaba intentando hacer).
        2. Indica si es peligroso o si es un proceso normal (como navegación por internet).
        3. En recomendaciones, da pasos claros que el operador pueda seguir (ej: "Preguntar al usuario si estaba usando tal aplicación" o "Bloquear esta IP si no la reconocen").
        
        RESPONDE ÚNICAMENTE EN ESTE FORMATO JSON:
        {{
          "summary": "Explicación sencilla y clara",
          "recommendation": "Paso 1\\nPaso 2\\nPaso 3"
        }}
        """

        try:
            target_url = f"{self.ollama_url}/api/generate"
            res = requests.post(
                target_url,
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "format": "json",
                    "stream": False,
                    "options": {
                        "temperature": 0.2,
                        "num_ctx": 2048,
                        "num_thread": 2
                    }
                },
                timeout=45
            )
            
            if res.status_code == 200:
                response_raw = res.json().get("response", "{}")
                content = json.loads(response_raw)
                summary = content.get("summary", "")
                remediation = content.get("recommendation", "")
                
                if isinstance(remediation, list):
                    remediation = "\n".join([f"- {str(i)}" for i in remediation])
                
                if len(summary) > 10:
                    return {"summary": summary, "remediation": remediation}
        except Exception as e:
            logger.warning(f"IA Pedagógica Falló: {e}")
        return None

    def _heuristic_analysis(self, raw_log: str) -> Dict[str, str]:
        """Análisis de respaldo con lenguaje sencillo."""
        raw_lower = raw_log.lower()
        ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
        ips = re.findall(ip_pattern, raw_log)
        src_ip = ips[0] if len(ips) > 0 else "una computadora interna"
        dst_ip = ips[1] if len(ips) > 1 else "un servidor externo"

        if "quic" in raw_lower or "udp/443" in raw_lower:
            return {
                "summary": f"La alerta se dio porque la computadora {src_ip} envió muchos datos rápidos hacia servidores de Google/Chrome ({dst_ip}). Esto es algo NORMAL cuando un usuario navega por internet o mira videos, pero el sistema de seguridad lo confunde con un escaneo por la velocidad del tráfico.",
                "recommendation": "1. No se requiere acción inmediata ya que es navegación web normal.\\n2. Confirmar si el usuario estaba navegando en ese horario.\\n3. Si el tráfico es constante y muy pesado, verificar que no sea una descarga no autorizada."
            }
        
        return {
            "summary": f"La alerta se dio porque se detectó una conexión inusual desde {src_ip} hacia {dst_ip}. El sistema de seguridad registró este movimiento y requiere que alguien valide si este acceso es parte del trabajo diario o un intento no autorizado.",
            "recommendation": "1. Identificar a quién pertenece la dirección IP de origen.\\n2. Consultar con el responsable del equipo si reconoce esta conexión.\\n3. En caso de duda, solicitar el bloqueo temporal del acceso."
        }

    def analyze_raw_log(self, raw_log: str) -> Dict[str, str]:
        if not raw_log:
            return {"summary": "Sin datos para analizar.", "remediation": "No se puede determinar la causa."}
        
        ai_result = self._call_ollama(raw_log)
        if ai_result:
            return ai_result
            
        return self._heuristic_analysis(raw_log)

expert_analysis_service = ExpertAnalysisService()

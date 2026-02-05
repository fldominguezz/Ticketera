from typing import Dict, Any
import re
import requests
import json
import logging
import os

logger = logging.getLogger(__name__)

class ExpertAnalysisService:
    def __init__(self):
        self.ollama_url = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
        self.model = "llama3.2:3b" # Modelo optimizado para análisis rápido
        
        # Heurística de respaldo (KB local)
        self.kb = {
            "actions": {
                "alert": "Modo OBSERVACIÓN: El sistema detectó la anomalía y generó el log, pero NO bloqueó el tráfico.",
                "deny": "Modo PROTECCIÓN: El sistema bloqueó la solicitud sospechosa activamente.",
                "block": "Modo PROTECCIÓN: La conexión fue cortada por el firewall."
            },
            "owasp": {
                "injection": "Categoría Crítica OWASP: Inyección. Intento de enviar datos no confiables a un intérprete.",
                "xss": "Cross-Site Scripting (XSS). Intento de inyectar scripts en el navegador."
            }
        }

    def _call_ollama(self, raw_log: str) -> Dict[str, str]:
        prompt = f"""
        Act as a Senior SOC Analyst. Analyze the following SIEM raw log and provide a technical summary and actionable recommendations.
        
        RAW LOG:
        {raw_log}
        
        Output MUST be valid JSON with two keys: "summary" (technical explanation of what happened) and "recommendation" (numbered list of steps to mitigate).
        Language: Spanish.
        Keep it concise and professional.
        """
        
        try:
            res = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "format": "json",
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "num_ctx": 4096,
                        "num_predict": 512
                    }
                },
                timeout=90 # Aumentamos a 90 segundos para dar margen al CPU
            )
            
            if res.status_code == 200:
                response_json = res.json()
                content = json.loads(response_json.get("response", "{}"))
                return {
                    "summary": content.get("summary", "Análisis completado por IA."),
                    "recommendation": content.get("recommendation", "Revisar logs.")
                }
        except Exception as e:
            logger.warning(f"Ollama AI failed: {e}. Falling back to heuristic analysis.")
            return None
        return None

    def _heuristic_analysis(self, raw_log: str) -> Dict[str, str]:
        # Lógica de respaldo robusta (la que ya teníamos)
        raw_lower = raw_log.lower()
        summary_parts = []
        recs = []

        # Detección básica
        if "sql" in raw_lower or "union" in raw_lower:
            summary_parts.append("Posible Inyección SQL detectada por patrones de sintaxis.")
            recs.append("1. Revisar input sanitization.\n2. Bloquear IP.")
        elif "xss" in raw_lower or "script" in raw_lower:
            summary_parts.append("Posible ataque XSS (Cross Site Scripting).")
            recs.append("1. Implementar CSP.\n2. Validar encoding de salida.")
        elif "pwd" in raw_lower:
            summary_parts.append("Tráfico de credenciales en texto plano detectado.")
            recs.append("1. Forzar HTTPS/SSH.\n2. Resetear contraseñas expuestas.")
        
        # Modo del Firewall
        action_match = re.search(r'action="?(\w+)"?', raw_lower)
        if action_match:
            action = action_match.group(1)
            if action in self.kb["actions"]:
                summary_parts.append(self.kb["actions"][action])

        if not summary_parts:
            return {
                "summary": "Evento de seguridad genérico. El sistema detectó una anomalía basada en firmas, pero no se identificó un patrón de ataque estándar en el análisis rápido.",
                "recommendation": "1. Investigar manualmente la IP de origen.\n2. Validar falsos positivos."
            }

        return {
            "summary": " ".join(summary_parts),
            "recommendation": "\n".join(recs)
        }

    def analyze_raw_log(self, raw_log: str) -> Dict[str, str]:
        if not raw_log:
            return {"summary": "Sin datos.", "recommendation": "N/A"}

        # 1. Intentar IA (Ollama)
        ai_result = self._call_ollama(raw_log)
        if ai_result:
            return ai_result

        # 2. Fallback a Heurística
        return self._heuristic_analysis(raw_log)

expert_analysis_service = ExpertAnalysisService()

from app.utils.security import validate_external_url
from app.utils.security import validate_external_url
import logging
import os
import requests
import json
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        env_url = os.getenv("OLLAMA_BASE_URL")
        self.base_url = env_url if env_url else "http://ollama:11434"
        self.model = os.getenv("OLLAMA_MODEL", "llama3.1:latest")
        logger.info(f"AI Service initialized. Base URL: {self.base_url}, Model: {self.model}")

    def _heuristic_analysis(self, title: str, description: str) -> str:
        """Respaldo si la IA no está disponible."""
        analysis = "ANÁLISIS AUTOMATIZADO (Heurístico):\n"
        combined = (title + " " + description).lower()
        
        if "password" in combined or "contraseña" in combined:
            analysis += "- Detectado posible incidente de acceso/credenciales.\n"
        if "virus" in combined or "malware" in combined or "trojan" in combined:
            analysis += "- Crítico: Posible presencia de código malicioso.\n"
        if "lento" in combined or "slow" in combined or "caido" in combined:
            analysis += "- Problema de disponibilidad o rendimiento detectado.\n"
        
        if len(analysis) < 40:
            analysis += "- Incidente de carácter general. Se requiere revisión manual de IoCs.\n"
            
        return analysis + "\nNota: El motor de IA (Ollama) no respondió correctamente, se usó análisis básico."

    def _call_ollama(self, prompt: str) -> str:
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": 300,
                "temperature": 0.7
            }
        }
        
        try:
            logger.info(f"AI REQUEST: Sending to {self.model} at {url}")
            validate_external_url(url)
            response = requests.post(url, json=payload, timeout=120.0)
            response.raise_for_status()
            data = response.json()
            return data.get("response", "").strip()
        except Exception as e:
            err_msg = f"CRITICAL OLLAMA ERROR: {str(e)}"
            logger.error(err_msg)
            # Forzamos print para ver en docker logs
            raise e

    async def summarize_ticket(self, title: str, description: str, comments: str = "") -> str:
        prompt = f"""
        Eres un experto analista de ciberseguridad del SOC de la Policia Federal Argentina. 
        Analiza y resume el siguiente incidente de seguridad de forma profesional y concisa en ESPAÑOL.
        Usa viñetas para resaltar puntos clave.
        
        Título: {title}
        Descripción Detallada (incluye logs):
        {description}
        
        Comentarios adicionales:
        {comments}
        
        Resumen del incidente:
        """
        try:
            # Corremos en thread para no bloquear el loop asíncrono si usamos requests
            import asyncio
            return await asyncio.to_thread(self._call_ollama, prompt)
        except Exception:
            return self._heuristic_analysis(title, description)

    async def predict_trends(self, stats_data: Dict[str, Any]) -> str:
        prompt = f"""
        Como Director de Ciberseguridad (CISO), analiza los siguientes datos de la plataforma y proporciona 3 insights predictivos o recomendaciones estratégicas en ESPAÑOL.
        Sé breve, profesional y usa un tono de autoridad técnica.
        
        DATOS ACTUALES:
        {json.dumps(stats_data)}
        
        ANÁLISIS ESTRATÉGICO:
        """
        try:
            import asyncio
            return await asyncio.to_thread(self._call_ollama, prompt)
        except Exception:
            return "- Se observa una estabilidad en la carga de incidentes.\n- Monitorear el incremento de alertas de firewall.\n- Asegurar que los tickets críticos tengan asignación inmediata."

ai_service = AIService()
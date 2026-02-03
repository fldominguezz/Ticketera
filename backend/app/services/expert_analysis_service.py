from typing import Dict, List, Any
import re

class ExpertAnalysisService:
    def __init__(self):
        # Definición de firmas de ataque y sus correspondientes análisis/recomendaciones
        self.signatures = [
            {
                "id": "udp_scan",
                "pattern": r"(UDP|scan|port|fixed port|fixed_port)",
                "summary": "Detección de escaneo UDP persistente hacia un puerto fijo. Este comportamiento sugiere una fase de reconocimiento avanzada o un intento de explotación de servicio vulnerable.",
                "recommendation": "1. Bloquear IP de origen en el Firewall perimetral.\n2. Verificar si el puerto de destino tiene servicios críticos expuestos.\n3. Monitorear logs de sistema para descartar intentos de inyección de comandos."
            },
            {
                "id": "brute_force",
                "pattern": r"(failed|login|authentication|incorrect|password|invalid)",
                "summary": "Múltiples intentos de inicio de sesión fallidos detectados. Coincide con patrón de ataque de fuerza bruta o 'credential stuffing'.",
                "recommendation": "1. Habilitar bloqueo temporal de cuenta (Account Lockout).\n2. Validar geolocalización de la IP de origen.\n3. Notificar al usuario titular sobre la actividad sospechosa."
            },
            {
                "id": "malware_cnc",
                "pattern": r"(cnc|c2|beacon|command_and_control|callback)",
                "summary": "Tráfico sospechoso hacia dominios o IPs asociadas a infraestructura de Comando y Control (C2). Peligro inminente de exfiltración de datos.",
                "recommendation": "1. Aislar el equipo afectado de la red inmediatamente.\n2. Iniciar escaneo forense de procesos en memoria.\n3. Resetear credenciales de dominio del usuario afectado."
            },
            {
                "id": "web_attack",
                "pattern": r"(SELECT|UNION|INSERT|UPDATE|DELETE|script|alert|<|>)",
                "summary": "Detección de caracteres especiales compatibles con ataques de Inyección SQL o Cross-Site Scripting (XSS).",
                "recommendation": "1. Revisar logs del servidor web (Nginx/Apache).\n2. Asegurar que las entradas del formulario estén sanitizadas.\n3. Aplicar reglas de WAF (Web Application Firewall)."
            }
        ]

    def analyze_raw_log(self, raw_log: str) -> Dict[str, str]:
        if not raw_log:
            return {
                "summary": "No se recibió información cruda (Raw Log) para analizar.",
                "recommendation": "Verificar la integración con FortiSIEM para asegurar la recepción de metadatos."
            }

        raw_log_lower = raw_log.lower()
        findings = []
        recommendations = []

        # Analizar contra firmas conocidas
        for sig in self.signatures:
            if re.search(sig["pattern"], raw_log_lower, re.IGNORECASE):
                findings.append(sig["summary"])
                recommendations.append(sig["recommendation"])

        # Si no hay coincidencias específicas, generar un análisis genérico
        if not findings:
            return {
                "summary": "Análisis de patrones completado. No se detectaron firmas de ataques conocidos en el log proporcionado. El evento parece ser una anomalía estructural o un evento informativo.",
                "recommendation": "1. Realizar una búsqueda manual en VirusTotal con los hashes o IPs involucrados.\n2. Revisar la regla del SIEM que disparó la alerta para descartar un falso positivo."
            }

        return {
            "summary": " ".join(findings),
            "recommendation": "\n\n".join(recommendations)
        }

expert_analysis_service = ExpertAnalysisService()
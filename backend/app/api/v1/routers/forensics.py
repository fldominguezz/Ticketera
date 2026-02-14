from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from typing import List, Any, Dict
import email
from email import policy
import hashlib
import re
import ipaddress
from app.api.deps import get_current_active_user, require_permission
from app.db.models import User
router = APIRouter()
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from typing import List, Any, Dict, Optional
import os
from app.api.deps import get_current_active_user, require_permission
from app.db.models import User
from app.utils.eml_parser import parse_eml_content
from app.services.virustotal import VirusTotalService
router = APIRouter()
def analyze_heuristic(msg_summary: Dict, body: str, urls: List[str], attachments: List[Dict]) -> Dict[str, Any]:
    analysis = {
        "malicious_links": [],
        "suspicious_attachments": [],
        "phishing_indicators": []
    }
    # 1. Enlaces Maliciosos (Heurística básica)
    suspicious_url_keywords = ['login', 'update', 'verify', 'account', 'security', 'signin', 'billing']
    legit_domains = ['policiafederal.gov.ar', 'microsoft.com', 'google.com', 'apple.com']
    for url in urls:
        url_lower = url.lower()
        is_legit = any(dom in url_lower for dom in legit_domains)
        if not is_legit and any(kw in url_lower for kw in suspicious_url_keywords):
            analysis["malicious_links"].append(f"URL Sospechosa detectada: {url}")
    # 2. Adjuntos Sospechosos
    dangerous_exts = ['.exe', '.zip', '.js', '.vbs', '.scr', '.bat', '.cmd', '.ps1', '.dll', '.chm', '.hta']
    for att in attachments:
        filename = att['filename'].lower()
        if any(filename.endswith(ext) for ext in dangerous_exts):
            analysis["suspicious_attachments"].append(f"Archivo potencialmente peligroso: {att['filename']}")
    # 3. Indicadores de Phishing
    subject = msg_summary.get('Subject', '').lower()
    body_lower = body.lower()
    # Palabras de urgencia
    urgency_keywords = ["urgente", "acción requerida", "atención", "suspendida", "verifique", "caduca", "alerta"]
    if any(kw in subject or kw in body_lower for kw in urgency_keywords):
        analysis["phishing_indicators"].append("Lenguaje de urgencia o amenaza detectado.")
    return analysis
@router.post("/analyze-eml")
async def analyze_eml(
    file: UploadFile = File(...),
    check_vt: bool = Form(False),
    vt_api_key: Optional[str] = Form(None),
    current_user: User = Depends(require_permission("forensics:eml:scan"))
):
    if not file.filename.lower().endswith('.eml'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .eml")
    content = await file.read()
    # 1. Parseo con Utilidad Modular
    headers_summary, body_text, urls, attachments, full_headers = parse_eml_content(content)
    # 2. Análisis Heurístico Local
    security_analysis = analyze_heuristic(headers_summary, body_text, urls, attachments)
    # 3. Análisis VirusTotal (Si se solicita)
    vt_results = {"verdict": "SKIPPED", "urls": [], "attachments": []}
    if check_vt:
        # Priorizar clave del usuario, sino ENV
        final_key = vt_api_key or os.getenv("VT_API_KEY")
        if not final_key:
            vt_results["verdict"] = "ERROR_NO_KEY"
        else:
            vt_service = VirusTotalService(final_key)
            vt_items = []
            # Check URLs
            for url in urls[:10]: # Limite para no saturar
                res = vt_service.check_url(url)
                res["target"] = url
                res["type"] = "url"
                vt_results["urls"].append(res)
                vt_items.append(res)
            # Check Hashes
            for att in attachments:
                res = vt_service.check_file_hash(att['sha256'])
                res["target"] = att['filename']
                res["type"] = "file"
                vt_results["attachments"].append(res)
                vt_items.append(res)
            # Veredicto Final
            vt_results["verdict"] = vt_service.calculate_verdict(vt_items)
    return {
        "summary": headers_summary,
        "full_headers": full_headers,
        "security": security_analysis,
        "vt_analysis": vt_results,
        "iocs": {"urls": urls},
        "attachments": attachments,
        "body": body_text[:5000] # Truncate body for response performance
    }

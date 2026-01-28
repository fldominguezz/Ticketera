from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from typing import List, Any, Dict
import email
from email import policy
import hashlib
import re
import ipaddress
from app.api.deps import get_current_active_user
from app.db.models import User

router = APIRouter()

def extract_urls(text: str) -> List[str]:
    url_pattern = r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+'
    return list(set(re.findall(url_pattern, text)))

def analyze_security(msg: Any, body: str, urls: List[str], attachments: List[Any]) -> Dict[str, Any]:
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
    subject = str(msg.get('Subject', '')).lower()
    body_lower = body.lower()
    
    # Palabras de urgencia
    urgency_keywords = ["urgente", "acción requerida", "atención", "suspendida", "verifique", "caduca", "alerta"]
    if any(kw in subject or kw in body_lower for kw in urgency_keywords):
        analysis["phishing_indicators"].append("Lenguaje de urgencia o amenaza detectado.")

    # Solicitud de credenciales
    cred_keywords = ["contraseña", "password", "usuario", "credenciales", "iniciar sesión", "verify now"]
    if any(kw in body_lower for kw in cred_keywords):
        analysis["phishing_indicators"].append("Solicitud de credenciales o información sensible detectada.")

    # Saludos genéricos
    generic_greetings = ["estimado usuario", "querido cliente", "estimado cliente", "dear customer"]
    if any(kw in body_lower[:200] for kw in generic_greetings):
        analysis["phishing_indicators"].append("Saludo genérico detectado (posible correo masivo).")

    # Desajuste de remitente
    from_header = str(msg.get('From', '')).lower()
    return_path = str(msg.get('Return-Path', '')).lower()
    if return_path and return_path != '<>' and return_path.strip('<>') not in from_header:
        analysis["phishing_indicators"].append(f"Desajuste de Remitente: From ({from_header}) vs Return-Path ({return_path}).")

    return analysis

@router.post("/analyze-eml")
async def analyze_eml(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    if not file.filename.lower().endswith('.eml'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .eml")

    content = await file.read()
    msg = email.message_from_bytes(content, policy=policy.default)

    # 1. Cabeceras Completas (Para la tabla técnica)
    full_headers = []
    for k, v in msg.items():
        full_headers.append({"key": k, "value": str(v)})

    headers_summary = {
        "Subject": msg.get('Subject', 'N/A'),
        "From": msg.get('From', 'N/A'),
        "To": msg.get('To', 'N/A'),
        "Date": msg.get('Date', 'N/A')
    }

    # 2. Análisis de Recepción (Hops)
    received_headers = msg.get_all('Received', [])
    hops = [str(hop) for hop in received_headers] if received_headers else []

    # 3. Cuerpo y IOCs
    body_text = ""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == 'text/plain' and 'attachment' not in str(part.get('Content-Disposition')):
                payload = part.get_payload(decode=True)
                if payload: body_text += payload.decode(errors='replace')
    else:
        payload = msg.get_payload(decode=True)
        if payload: body_text = payload.decode(errors='replace')

    urls = extract_urls(body_text)
    
    # 4. Adjuntos
    attachments = []
    for part in msg.walk():
        if part.get_content_disposition() == 'attachment':
            file_data = part.get_payload(decode=True)
            filename = part.get_filename() or "unnamed_file"
            attachments.append({
                "filename": filename,
                "content_type": part.get_content_type(),
                "size": len(file_data),
                "sha256": hashlib.sha256(file_data).hexdigest()
            })

    # 5. Seguridad Heurística (Lo que pidió el usuario)
    security_analysis = analyze_security(msg, body_text, urls, attachments)

    return {
        "summary": headers_summary,
        "full_headers": full_headers,
        "security": security_analysis,
        "hops": hops,
        "iocs": {"urls": urls},
        "attachments": attachments,
        "body": body_text
    }

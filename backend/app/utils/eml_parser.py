import email
from email import policy
import re
import hashlib
from typing import List, Dict, Any, Tuple

def extract_urls(text: str) -> List[str]:
    """Extrae y normaliza URLs de texto."""
    # Regex mejorado para capturar URLs completas
    url_pattern = r'(https?://[^\s<>\"]+|www\.[^\s<>\"]+)'
    urls = re.findall(url_pattern, text)
    # Limpieza básica
    clean_urls = []
    for u in urls:
        u = u.rstrip('.,;)>]')
        clean_urls.append(u)
    return list(set(clean_urls))

def parse_eml_content(content: bytes) -> Tuple[Dict, str, List[str], List[Dict]]:
    """
    Parsea el contenido raw de un EML.
    Retorna: (Headers, BodyText, URLs, Attachments)
    """
    msg = email.message_from_bytes(content, policy=policy.default)

    # 1. Headers
    full_headers = []
    for k, v in msg.items():
        full_headers.append({"key": k, "value": str(v)})

    headers_summary = {
        "Subject": str(msg.get('Subject', 'N/A')),
        "From": str(msg.get('From', 'N/A')),
        "To": str(msg.get('To', 'N/A')),
        "Date": str(msg.get('Date', 'N/A')),
        "Return-Path": str(msg.get('Return-Path', 'N/A')),
        "Message-ID": str(msg.get('Message-ID', 'N/A'))
    }

    # 2. Body & Attachments
    body_text = ""
    attachments = []

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            disposition = str(part.get('Content-Disposition'))

            if 'attachment' in disposition:
                file_data = part.get_payload(decode=True)
                if file_data:
                    filename = part.get_filename() or "unnamed_file"
                    sha256 = hashlib.sha256(file_data).hexdigest()
                    attachments.append({
                        "filename": filename,
                        "content_type": content_type,
                        "size": len(file_data),
                        "sha256": sha256
                    })
            elif content_type == 'text/plain':
                payload = part.get_payload(decode=True)
                if payload:
                    body_text += payload.decode(errors='replace') + "\n"
            elif content_type == 'text/html':
                # Opcional: Podríamos usar BS4 aquí si estuviera instalado para extraer hrefs
                # Por ahora concatenamos raw para que el regex busque URLs
                payload = part.get_payload(decode=True)
                if payload:
                    body_text += payload.decode(errors='replace') + "\n"
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            body_text = payload.decode(errors='replace')

    # 3. URLs
    urls = extract_urls(body_text)

    return headers_summary, body_text, urls, attachments, full_headers

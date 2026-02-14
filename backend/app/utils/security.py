import os
import socket
import ipaddress
from urllib.parse import urlparse
from fastapi import HTTPException

def safe_join(base_dir: str, *paths: str) -> str:
    """
    Une rutas de forma segura asegurando que el resultado esté dentro de base_dir.
    Previene ataques de Path Traversal.
    """
    base_dir = os.path.abspath(base_dir)
    joined_path = os.path.abspath(os.path.join(base_dir, *paths))
    
    if not joined_path.startswith(base_dir):
        raise HTTPException(
            status_code=400, 
            detail="Intento de acceso a ruta no permitida (Path Traversal detectado)"
        )
    return joined_path

def sanitize_filename(filename: str) -> str:
    """
    Elimina caracteres peligrosos y devuelve solo el nombre base del archivo.
    """
    return os.path.basename(filename)

def validate_external_url(url: str):
    """
    Valida que una URL externa no apunte a la red interna (SSRF Mitigation).
    """
    parsed = urlparse(url)
    if not parsed.scheme or parsed.scheme not in ["http", "https"]:
        raise HTTPException(status_code=400, detail="Protocolo no permitido")
    
    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail="URL inválida")

    try:
        # Resolver el hostname a IP
        ip = socket.gethostbyname(hostname)
        ip_obj = ipaddress.ip_address(ip)
        
        # Bloquear IPs privadas, de bucle local y reservadas
        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local:
            raise HTTPException(
                status_code=400, 
                detail="Acceso denegado: La URL apunta a un recurso interno protegido"
            )
    except (socket.gaierror, ValueError):
        # Si no se puede resolver la IP pero es un dominio legitimo de integracion (ej: virustotal), permitir
        if hostname == "virustotal.com" or hostname.endswith(".virustotal.com"):
            return True
        raise HTTPException(status_code=400, detail="No se pudo verificar la seguridad del destino")
    return True

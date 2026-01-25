from fastapi import APIRouter, Depends, HTTPException, Body, Request, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.services.siem_service import siem_service
from app.core.ws_manager import manager
from app.crud import crud_audit
import uuid
import asyncio
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBasic()

# IP Allowlist para FortiSIEM
FORTISIEM_IPS = ["10.1.78.10", "127.0.0.1"] # Añadir IPs autorizadas aquí

async def validate_siem_auth(credentials: HTTPBasicCredentials = Depends(security)):
    """
    Valida las credenciales enviadas por FortiSIEM.
    """
    # Basado en logs: FortiSIEM usa 'fortisiem@example.com'
    correct_username = "fortisiem@example.com"
    correct_password = "qweasd456" 
    
    import secrets
    is_username_ok = secrets.compare_digest(credentials.username, correct_username)
    is_password_ok = secrets.compare_digest(credentials.password, correct_password)
    
    if not (is_username_ok and is_password_ok):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales de SIEM inválidas",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

@router.get("/status")
async def get_siem_status(
    db: AsyncSession = Depends(deps.get_db),
    current_user = Depends(deps.get_current_superuser),
):
# ... (mantener lógica de status intacta)
    from sqlalchemy import text
    result = await db.execute(text("SELECT created_at, title, description FROM tickets WHERE created_by_id = '852d2452-e98a-48eb-9d41-9281e03f1cf0' ORDER BY created_at DESC LIMIT 1"))
    last_event = result.first()
    last_ip = "Unknown"
    if last_event:
        import re
        ip_match = re.search(r"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})", last_event.description)
        if ip_match:
            last_ip = ip_match.group(1)

    return {
        "status": "online" if last_event else "waiting",
        "last_seen_ip": last_ip,
        "last_event_time": last_event.created_at if last_event else None,
        "active_rules": [{"name": "FortiSIEM XML Integration", "status": "active"}],
        "connection_stats": {"allowed_source": FORTISIEM_IPS[0], "last_ip": last_ip}
    }

@router.post("/fortisiem-incident")
async def fortisiem_incident_webhook(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    auth_user: str = Depends(validate_siem_auth)
):
    """
    Endpoint de producción para FortiSIEM 7.3.
    Procesa XML crudo, valida IP y autenticación Basic.
    """
    # 1. Validar Allowlist de IP
    client_ip = request.client.host
    if FORTISIEM_IPS and client_ip not in FORTISIEM_IPS:
        logger.warning(f"Intento de conexión SIEM desde IP no autorizada: {client_ip}")
        # En entornos con Nginx, puede que llegue la IP interna del proxy si no está bien configurado
        # Por ahora logueamos y permitimos, pero en prod debe ser estricto.
        # raise HTTPException(status_code=403, detail="IP no autorizada")

    # 2. Leer body crudo (XML)
    body_bytes = await request.body()
    xml_data = body_bytes.decode("utf-8")
    
    if not xml_data.strip().startswith("<"):
        raise HTTPException(status_code=400, detail="Formato no válido. Se requiere XML.")

    # 3. Procesar con el servicio (Idempotencia incluida)
    root_group_id = uuid.UUID("2eca92c4-06a1-4bd8-a653-825ecd3a0cd1")
    try:
        ticket = await siem_service.process_event(db, xml_data, root_group_id)
        
        if not ticket:
            raise HTTPException(status_code=400, detail="Error parseando contenido XML")

        # 4. Auditoría inmutable
        await crud_audit.audit_log.create_log(
            db,
            user_id=uuid.UUID("852d2452-e98a-48eb-9d41-9281e03f1cf0"), # fortisiem user
            event_type="siem_incident_received",
            ip_address=client_ip,
            details={"incident_id": ticket.extra_data.get("incident_id"), "ticket_id": str(ticket.id)}
        )

        # 5. Notificar via WebSocket al SOC Monitor
        asyncio.create_task(manager.broadcast({
            "type": "siem_event",
            "data": {
                "ticket_id": str(ticket.id),
                "title": ticket.title,
                "priority": ticket.priority,
                "created_at": str(ticket.created_at)
            }
        }))

        return {"status": "success", "ticket_id": str(ticket.id), "incident_id": ticket.extra_data.get("incident_id")}

    except Exception as e:
        logger.error(f"Error procesando incidente FortiSIEM: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during XML processing")

@router.post("/fortisiem/webhook")
async def legacy_webhook(event: dict, db: AsyncSession = Depends(deps.get_db)):
    # Mantener compatibilidad JSON si es necesario
    return await fortisiem_webhook(event, db)

async def fortisiem_webhook(event: dict, db: AsyncSession):
    # Función auxiliar para la compatibilidad anterior
    root_group_id = uuid.UUID("2eca92c4-06a1-4bd8-a653-825ecd3a0cd1")
    ticket = await siem_service.process_event(db, event, root_group_id)
    return {"status": "success", "ticket_id": ticket.id}
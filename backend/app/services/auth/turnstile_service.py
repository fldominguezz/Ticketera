import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class TurnstileService:
    def __init__(self):
        self.verify_url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
        self.secret_key = getattr(settings, "TURNSTILE_SECRET_KEY", "")

    async def verify_token(self, token: str, remote_ip: str = None) -> bool:
        """
        Verifies a Turnstile token with Cloudflare.
        """
        if not token:
            return False
            
        # Si no hay llave configurada, loguear y rechazar
        if not self.secret_key:
            logger.warning("TURNSTILE_SECRET_KEY not configured.")
            return False

        try:
            async with httpx.AsyncClient() as client:
                data = {
                    "secret": self.secret_key,
                    "response": token
                }
                if remote_ip:
                    data["remoteip"] = remote_ip
                    
                response = await client.post(self.verify_url, data=data)
                result = response.json()
                
                if result.get("success"):
                    return True
                
                logger.warning(f"Turnstile verification failed: {result.get('error-codes')}")
                return False
        except Exception as e:
            logger.error(f"Error connecting to Cloudflare Turnstile: {e}")
            # En caso de error de conexión, permitimos pasar para no bloquear el login si CF cae,
            # pero lo logueamos como error crítico.
            return True 

turnstile_service = TurnstileService()

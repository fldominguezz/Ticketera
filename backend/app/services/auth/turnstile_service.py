import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class TurnstileService:
    def __init__(self):
        self.verify_url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
        self.secret_key = getattr(settings, "TURNSTILE_SECRET_KEY", "1x000000000000000000000000000000AA")

    async def verify_token(self, token: str, remote_ip: str = None) -> bool:
        """
        Verifies a Turnstile token with Cloudflare.
        """
        if not token:
            return False
            
        # Si estamos en modo de prueba o sin llave configurada, permitimos tokens de prueba
        if self.secret_key == "1x000000000000000000000000000000AA" and token == "XXXX.DUMMY.TOKEN.XXXX":
            return True

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

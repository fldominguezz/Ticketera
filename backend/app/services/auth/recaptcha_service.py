import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class ReCaptchaService:
    def __init__(self):
        self.verify_url = "https://www.google.com/recaptcha/api/siteverify"
        # Secret Key de Google (Cargar desde settings o .env)
        self.secret_key = getattr(settings, "RECAPTCHA_SECRET_KEY", "")

    async def verify_token(self, token: str, remote_ip: str = None) -> bool:
        """
        Verifies a Google reCAPTCHA token.
        """
        if not token:
            return False
            
        # Si no hay llave configurada, permitimos pasar para no bloquear (Modo desarrollo)
        if not self.secret_key:
            logger.warning("RECAPTCHA_SECRET_KEY not configured. Bypassing verification.")
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
                
                logger.warning(f"reCAPTCHA verification failed: {result.get('error-codes')}")
                return False
        except Exception as e:
            logger.error(f"Error connecting to Google reCAPTCHA: {e}")
            return True 

recaptcha_service = ReCaptchaService()

from datetime import datetime, timedelta, timezone
from typing import Any, Optional, List
from passlib.context import CryptContext
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession
import pyotp
import string
import random
from app.core.config import settings
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
ALGORITHM = settings.ALGORITHM
# --- Password ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a hashed one."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        # Log the error but don't crash the whole request
        import logging
        logging.getLogger(__name__).error(f"Password verification error: {e}")
        return False
def get_password_hash(password: str) -> str:
    """Hashes a plain password."""
    return pwd_context.hash(password)
# --- JWT ---
def create_access_token(
    subject: Any, expires_delta: Optional[timedelta] = None, claims: Optional[dict] = None
) -> str:
    """Creates a new access token with a subject and optional claims."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    if claims:
        to_encode.update(claims)
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
def decode_token(token: str) -> Optional[dict]:
    """Decodes a JWT token and returns the payload if valid."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None
# ... existing code ...
# --- TOTP (2FA) ---
def generate_totp_secret() -> str:
    """Generate a new secret for TOTP."""
    return pyotp.random_base32()
def get_totp_provisioning_uri(email: str, secret: str) -> str:
    """Get the provisioning URI for QR code generation."""
    return pyotp.totp.TOTP(secret).provisioning_uri(
        name=email, issuer_name=settings.PROJECT_NAME
    )
def verify_totp(secret: str, code: str) -> bool:
    """Verify a TOTP code with a small time window tolerance."""
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)
# --- Recovery Codes ---
def generate_recovery_codes(k: int = 10, length: int = 10) -> List[str]:
    """Generate a list of single-use recovery codes."""
    codes = []
    chars = string.ascii_uppercase + string.digits
    for _ in range(k):
        codes.append("".join(random.choice(chars) for _ in range(length)))
    return codes
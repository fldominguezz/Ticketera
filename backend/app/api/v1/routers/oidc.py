from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.core.config import settings
from app.db.models import User
import uuid
import time
router = APIRouter()
# Almacenamiento temporal de códigos de autorización (En memoria para simplicidad)
auth_codes = {}
@router.get("/authorize")
async def authorize(
    request: Request,
    redirect_uri: str,
    state: str = None,
    client_id: str = None
):
    """
    Paso 1: Docmost pide autorización.
    """
    # Verificamos si hay un token de la ticketera en la URL o cookie
    # Para simplificar, el botón de la wiki nos mandará aquí con el token de la Ticketera
    token = request.query_params.get("token")
    if not token:
        # Si no hay token, redirigimos al login de la Ticketera
        return RedirectResponse(url=f"https://10.1.9.240/login?redirect={redirect_uri}")
    # Generar un código temporal
    code = str(uuid.uuid4())
    auth_codes[code] = {"token": token, "created_at": time.time()}
    # Redirigir de vuelta a Docmost con el código
    return RedirectResponse(url=f"{redirect_uri}?code={code}&state={state}")
@router.post("/token")
async def get_token(request: Request):
    """
    Paso 2: Docmost canjea el código por un 'access_token'.
    """
    form_data = await request.form()
    code = form_data.get("code")
    if code not in auth_codes:
        raise HTTPException(status_code=400, detail="Código inválido o expirado")
    data = auth_codes.pop(code)
    # Retornamos el token de la Ticketera como si fuera el de OIDC
    return {
        "access_token": data["token"],
        "token_type": "Bearer",
        "expires_in": 3600,
        "id_token": data["token"] # Simplificado
    }
@router.get("/userinfo")
async def userinfo(request: Request, db: AsyncSession = Depends(deps.get_db)):
    """
    Paso 3: Docmost pide los datos del usuario usando el token.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401)
    token = auth_header.replace("Bearer ", "")
    # Decodificar token para obtener el usuario
    from jose import jwt
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_aud": False})
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")
    from sqlalchemy.future import select
    res = await db.execute(select(User).filter(User.id == uuid.UUID(user_id)))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404)
    return {
        "sub": str(user.id),
        "name": f"{user.first_name} {user.last_name}",
        "email": user.email,
        "email_verified": True,
        "preferred_username": user.username
    }
@router.get("/access")
async def access_wiki(token: str = Query(...)):
    """
    El botón de la Ticketera llama aquí.
    """
    # Mandamos al authorize de nuestra propia Ticketera
    return {"url": f"https://10.1.9.240:3005/api/auth/oidc/ticketera_wiki"}

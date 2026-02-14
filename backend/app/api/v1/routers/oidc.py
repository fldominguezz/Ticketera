from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import RedirectResponse
from app.utils.security import validate_external_url

router = APIRouter()

@router.get("/login")
async def oidc_login(redirect_url: str = Query(...)):
    # Validar que la URL sea de confianza
    if not validate_external_url(redirect_url):
        raise HTTPException(status_code=400, detail="Redirect URL no confiable")
    
    # Lógica de login...
    return RedirectResponse(url=redirect_url)

@router.get("/callback")
async def oidc_callback(state: str, code: str):
    # Procesar callback...
    return {"status": "ok"}

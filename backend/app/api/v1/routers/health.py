from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
router = APIRouter()
@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        # Verificar conexión a la base de datos
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected", "version": "1.0.0"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}, 503

from app.utils.security import safe_join, sanitize_filename
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
import psutil
import os
import shutil
import subprocess
from datetime import datetime
from typing import Any, List, Annotated
from app.api.deps import get_db, require_role
from app.core.config import settings
router = APIRouter()
BACKUP_DIR = "/root/Ticketera/backups"
@router.get("/ping", tags=["health"])
async def ping() -> Any:
    """
    Public endpoint for healthchecks.
    """
    return {"status": "ok", "timestamp": datetime.now().isoformat()}
@router.get("/health")
async def get_system_health(
    current_user: Annotated[Any, Depends(require_role(['owner', 'admin']))]
) -> Any:
    # Memory usage
    memory = psutil.virtual_memory()
    # Disk usage
    disk = psutil.disk_usage('/')
    return {
        "memory": {
            "total": memory.total,
            "available": memory.available,
            "used": memory.used,
            "percent": memory.percent
        },
        "disk": {
            "total": disk.total,
            "free": disk.free,
            "used": disk.used,
            "percent": disk.percent
        },
        "os": os.name,
        "cpu_count": psutil.cpu_count(),
        "cpu_percent": psutil.cpu_percent(interval=1)
    }
@router.post("/backup/create")
async def create_backup(
    current_user: Annotated[Any, Depends(require_role(['owner', 'admin']))]
) -> Any:
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup_{timestamp}.sql"
    filepath = safe_join(BACKUP_DIR, sanitize_filename(filename))
    db_user = os.getenv("POSTGRES_USER", "postgres")
    db_name = os.getenv("POSTGRES_DB", "ticketera")
    db_host = "db" # In docker-compose it's 'db'
    db_pass = os.getenv("POSTGRES_PASSWORD", "postgres")
    try:
        env = os.environ.copy()
        env["PGPASSWORD"] = db_pass
        with open(filepath, "w") as f:
            # Use full path for pg_dump to avoid PATH manipulation risks
            subprocess.run(
                ["/usr/bin/pg_dump", "-h", db_host, "-U", db_user, db_name],
                env=env,
                stdout=f,
                check=True,
                shell=False
            )
        return {"message": "Backup created successfully", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")
@router.get("/backups")
async def list_backups(
    current_user: Annotated[Any, Depends(require_role(['owner', 'admin']))]
) -> List[dict]:
    if not os.path.exists(BACKUP_DIR):
        return []
    backups = []
    for f in os.listdir(BACKUP_DIR):
        if f.endswith(".sql"):
            path = safe_join(BACKUP_DIR, sanitize_filename(f))
            stats = os.stat(path)
            backups.append({
                "filename": f,
                "size": stats.st_size,
                "created_at": datetime.fromtimestamp(stats.st_ctime).isoformat()
            })
    return sorted(backups, key=lambda x: x["created_at"], reverse=True)
@router.get("/backups/{filename}/download")
async def download_backup(
    filename: str,
    current_user: Annotated[Any, Depends(require_role(['owner', 'admin']))]
):
    filepath = safe_join(BACKUP_DIR, sanitize_filename(filename))
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Backup file not found")
    return FileResponse(path=filepath, filename=filename, media_type='application/sql')
@router.delete("/backups/{filename}")
async def delete_backup(
    filename: str,
    current_user: Annotated[Any, Depends(require_role(['owner', 'admin']))]
):
    filepath = safe_join(BACKUP_DIR, sanitize_filename(filename))
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Backup file not found")
    os.remove(filepath)
    return {"message": "Backup deleted"}

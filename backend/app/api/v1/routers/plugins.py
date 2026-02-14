from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api.deps import get_db, require_permission # Updated import
from app.db.models.plugin import Plugin as PluginModel
from app.schemas.plugin import Plugin, PluginCreate, PluginUpdate, UpdateCheck
from app.db.models import User # Explicitly import User for Annotated
router = APIRouter()
@router.get("/check-updates", response_model=UpdateCheck)
async def check_updates(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("plugins:read:all"))], # Updated dependency
):
    result = await db.execute(select(PluginModel).filter(PluginModel.name == "System Core"))
    core = result.scalar_one_or_none()
    current_version = core.version if core else "1.2.6"
    latest_version = "1.2.7" # Mocking latest version
    return {
        "update_available": current_version < latest_version,
        "current_version": current_version,
        "latest_version": latest_version,
        "changelog": [
            "Mejoras en el motor de SLA",
            "Nuevas transiciones de Workflow",
            "Corrección de errores en reportes PDF"
        ]
    }
@router.get("", response_model=List[Plugin])
async def read_plugins(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("plugins:read:all"))], # Updated dependency
):
    result = await db.execute(select(PluginModel))
    return result.scalars().all()
@router.post("", response_model=Plugin)
async def create_plugin(
    plugin_in: PluginCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("plugins:manage"))], # Updated dependency
):
    plugin = PluginModel(**plugin_in.model_dump())
    db.add(plugin)
    await db.commit()
    await db.refresh(plugin)
    return plugin
@router.patch("/{plugin_id}", response_model=Plugin)
async def update_plugin(
    plugin_id: str,
    plugin_in: PluginUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("plugins:manage"))], # Updated dependency
):
    result = await db.execute(select(PluginModel).filter(PluginModel.id == plugin_id))
    plugin = result.scalar_one_or_none()
    if not plugin:
        raise HTTPException(status_code=404, detail="Plugin not found")
    update_data = plugin_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(plugin, key, value)
    db.add(plugin)
    await db.commit()
    await db.refresh(plugin)
    return plugin
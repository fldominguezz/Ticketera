from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from datetime import datetime, timedelta
from typing import Any, List, Annotated, Dict
from uuid import UUID

from app.api.deps import get_db, require_permission, require_role
from app.db.models.user import User
from app.db.models.group import Group
from app.db.models.ticket import Ticket, TicketType
from app.db.models.alert import Alert
from app.db.models.asset import Asset
from app.db.models.location import LocationNode
from app.db.models.dashboard import DashboardConfig as DashboardModel
from app.schemas.dashboard import DashboardConfig, DashboardConfigCreate, DashboardConfigUpdate, WidgetConfig
from app.services.group_service import group_service

router = APIRouter()

# --- Helpers ---

async def get_siem_type_ids(db: AsyncSession):
    res = await db.execute(select(TicketType.id).where(TicketType.name.ilike('%SIEM%')))
    return res.scalars().all()

# --- Config Management ---

@router.get("/config", response_model=DashboardConfig)
async def get_my_dashboard_config(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("dashboard:view"))]
):
    """
    Get the active dashboard config for the current user.
    Priority: 1. Personal, 2. Group Default, 3. System Default.
    """
    # 1. Look for Personal Default
    res = await db.execute(
        select(DashboardModel).where(DashboardModel.user_id == current_user.id, DashboardModel.is_default == True)
    )
    config = res.scalar_one_or_none()
    
    # 2. Look for Group Default
    if not config and current_user.group_id:
        res = await db.execute(
            select(DashboardModel).where(DashboardModel.group_id == current_user.group_id, DashboardModel.is_default == True)
        )
        config = res.scalar_one_or_none()
        
    # 3. Fallback to System Default (no user, no group)
    if not config:
        res = await db.execute(
            select(DashboardModel).where(DashboardModel.user_id == None, DashboardModel.group_id == None, DashboardModel.is_default == True)
        )
        config = res.scalar_one_or_none()
        
    if not config:
        # Create a hardcoded fallback if absolutely nothing exists in DB
        return {
            "id": UUID("00000000-0000-0000-0000-000000000000"),
            "name": "Default Dashboard",
            "layout": [
                {"id": "w1", "type": "kpi", "title": "Tickets Activos", "data_source": "tickets_count", "w": 6, "h": 2, "x": 0, "y": 0},
                {"id": "w2", "type": "chart_donut", "title": "Estado de Alertas", "data_source": "siem_alerts", "w": 6, "h": 2, "x": 6, "y": 0}
            ],
            "is_default": True,
            "is_locked": False
        }
        
    return config

@router.post("/config", response_model=DashboardConfig)
async def save_dashboard_config(
    config_in: DashboardConfigCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("dashboard:edit"))]
):
    """
    Save a dashboard configuration. 
    If group_id is provided, checks for 'admin:dashboard:group' permission.
    """
    # Check if saving as group template
    if config_in.group_id:
        # Verify user belongs to group or is admin
        is_admin = current_user.is_superuser or any(r.role.name in ['admin', 'owner', 'Administrator'] for r in current_user.roles if r.role)
        if not is_admin and current_user.group_id != config_in.group_id:
             raise HTTPException(status_code=403, detail="Not authorized to save group templates")
        
        target_user = None
        target_group = config_in.group_id
    else:
        target_user = current_user.id
        target_group = None

    # Update or Create
    # For simplicity in this iteration, we look for an existing one with the same name to update, or create new.
    res = await db.execute(
        select(DashboardModel).where(
            DashboardModel.name == config_in.name,
            DashboardModel.user_id == target_user,
            DashboardModel.group_id == target_group
        )
    )
    db_obj = res.scalar_one_or_none()
    
    layout_data = [w.model_dump() for w in config_in.layout]

    if db_obj:
        db_obj.layout = layout_data
        db_obj.is_default = config_in.is_default
    else:
        db_obj = DashboardModel(
            name=config_in.name,
            description=config_in.description,
            user_id=target_user,
            group_id=target_group,
            layout=layout_data,
            is_default=config_in.is_default
        )
        db.add(db_obj)
        
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.post("/reset", response_model=DashboardConfig)
async def reset_dashboard_config(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("dashboard:edit"))]
):
    """
    Elimina la configuración personal para volver a la del grupo o sistema.
    """
    res = await db.execute(
        select(DashboardModel).where(DashboardModel.user_id == current_user.id)
    )
    configs = res.scalars().all()
    for c in configs:
        await db.delete(c)
    
    await db.commit()
    return await get_my_dashboard_config(db, current_user)

# --- Data Provisioning (The Heart of the Widget System) ---

@router.post("/widget-data")
async def get_widget_data(
    widget: WidgetConfig,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("dashboard:view"))]
):
    """
    Dynamic data provider for a single widget.
    Processes data_source and filters based on user context.
    """
    source = widget.data_source
    filters = widget.filters or {}
    
    # 1. Source: Tickets
    if source == "tickets_count":
        siem_type_ids = await get_siem_type_ids(db)
        ticket_filters = [Ticket.deleted_at == None]
        if siem_type_ids:
            ticket_filters.append(Ticket.ticket_type_id.notin_(siem_type_ids))
        
        # Lógica de jerarquía: Ver mi grupo y descendientes
        if not current_user.is_superuser:
            if not current_user.group_id:
                return {"type": "tickets", "data": {}, "total": 0}
            group_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
            ticket_filters.append(Ticket.group_id.in_(group_ids))
            
        # Apply specific widget filters if any
        if filters.get("status"):
            ticket_filters.append(Ticket.status == filters.get("status"))

        status_query = select(Ticket.status, func.count(Ticket.id)).where(and_(*ticket_filters)).group_by(Ticket.status)
        res = await db.execute(status_query)
        data = {row.status: row.count for row in res}
        return {"type": "tickets", "data": data, "total": sum(data.values())}

    # 2. Source: SIEM (Alertas técnicas)
    if source == "siem_alerts":
        # Las alertas son eventos técnicos globales
        cat_query = select(Alert.rule_name, func.count(Alert.id)).group_by(Alert.rule_name).order_by(func.count(Alert.id).desc()).limit(5)
        res = await db.execute(cat_query)
        return {"type": "siem", "categories": [{"name": r.rule_name[:25], "count": r.count} for r in res]}

    # 3. Source: Assets
    if source == "assets_status":
        asset_filters = [Asset.deleted_at == None]
        
        # Lógica de jerarquía para Activos
        if not current_user.is_superuser:
            if current_user.group_id:
                group_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
                asset_filters.append(Asset.owner_group_id.in_(group_ids))
            else:
                return {"type": "assets", "data": {}}

        res = await db.execute(select(Asset.status, func.count(Asset.id)).where(and_(*asset_filters)).group_by(Asset.status))
        return {"type": "assets", "data": {row.status: row.count for row in res}}

    return {"error": "Unknown data source"}

# Keep legacy stats for compatibility during transition
@router.get("/stats")
async def get_dashboard_stats_legacy(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("dashboard:view"))]
) -> Any:
    """
    Endpoint de estadísticas unificado para el Dashboard Principal.
    """
    # 1. Obtener IDs de tipos de ticket SIEM
    siem_type_ids = await get_siem_type_ids(db)
    
    # 2. Filtros base
    ticket_filters = [Ticket.deleted_at == None]
    asset_filters = [Asset.deleted_at == None]
    
    # Silos de visibilidad
    if not current_user.is_superuser:
        if current_user.group_id:
            group_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
            ticket_filters.append(Ticket.group_id.in_(group_ids))
            asset_filters.append(Asset.owner_group_id.in_(group_ids))
        else:
            ticket_filters.append(Ticket.id == None)
            asset_filters.append(Asset.id == None)

    # --- SIEM CONDITION (DEFINED FIRST) ---
    # Criterio ampliado: Tipo SIEM O Título que contenga SOC/SIEM/ALERTA
    siem_condition = or_(
        Ticket.ticket_type_id.in_(siem_type_ids) if siem_type_ids else False,
        Ticket.title.ilike("%SOC%"),
        Ticket.title.ilike("%SIEM%"),
        Ticket.title.ilike("%ALERTA%")
    )

    # --- TICKETS STATS ---
    # Contar por estado, excluyendo SIEM/SOC de los contadores de "Tickets" normales
    tickets_query = select(Ticket.status, func.count(Ticket.id)).where(
        and_(*ticket_filters, ~siem_condition)
    ).group_by(Ticket.status)
    res_tickets = await db.execute(tickets_query)
    t_data = {row.status: row.count for row in res_tickets}
    
    # --- SIEM STATS (ALERTAS REALES) ---
    siem_data = {"total": 0, "remediated": 0, "in_process": 0, "open": 0, "categories": []}
    
    # Contar por estado desde la tabla de ALERTAS
    res_siem = await db.execute(select(Alert.status, func.count(Alert.id)).group_by(Alert.status))
    s_stats = {row.status: row.count for row in res_siem}
    
    siem_data["total"] = sum(s_stats.values())
    siem_data["remediated"] = s_stats.get("resolved", 0) + s_stats.get("closed", 0)
    siem_data["in_process"] = s_stats.get("in_progress", 0)
    siem_data["open"] = s_stats.get("new", 0) + s_stats.get("open", 0)
    
    # Categorías (Top 5 de Reglas del SIEM)
    res_cats = await db.execute(
        select(Alert.rule_name, func.count(Alert.id))
        .group_by(Alert.rule_name)
        .order_by(func.count(Alert.id).desc())
        .limit(5)
    )
    
    siem_data["categories"] = [{"name": r.rule_name[:25], "count": r.count} for r in res_cats]

    # --- DISPOSITIVOS AFECTADOS (FIREWALLS) ---
    # Extraemos devname del raw_log de las alertas
    import re
    res_logs = await db.execute(select(Alert.raw_log).where(Alert.raw_log != None))
    logs = res_logs.scalars().all()
    
    dev_counts = {}
    for log in logs:
        # Buscar devname="VALOR" o devname=VALOR
        match = re.search(r'devname="?([^"\s,]+)"?', log)
        if match:
            dev = match.group(1)
            dev_counts[dev] = dev_counts.get(dev, 0) + 1
            
    # Ordenar y tomar Top 5
    top_devs = sorted(dev_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    siem_data["affected_devices"] = [{"name": name, "count": count} for name, count in top_devs]

    # --- ASSETS STATS ---
    res_assets = await db.execute(select(Asset.status, func.count(Asset.id)).where(and_(*asset_filters)).group_by(Asset.status))
    a_stats = {row.status: row.count for row in res_assets}
    
    # Top Ubicaciones
    loc_q = select(LocationNode.name, func.count(Asset.id)).join(Asset, Asset.location_node_id == LocationNode.id).where(
        and_(*asset_filters)
    ).group_by(LocationNode.name).order_by(func.count(Asset.id).desc()).limit(5)
    res_locs = await db.execute(loc_q)
    
    return {
        "role": current_user.group.name if current_user.group else "Usuario",
        "tickets": {
            "total": sum(t_data.values()),
            "open": t_data.get("open", 0) + t_data.get("new", 0),
            "in_progress": t_data.get("in_progress", 0),
            "resolved": t_data.get("resolved", 0),
            "closed": t_data.get("closed", 0)
        },
        "siem": siem_data,
        "assets": {
            "operative": a_stats.get("operative", 0),
            "pending_tagging": a_stats.get("tagging_pending", 0),
            "installing": a_stats.get("maintenance", 0),
            "no_folder": a_stats.get("no_folder", 0),
            "by_location": [{"name": r.name, "count": r.count} for r in res_locs]
        }
    }

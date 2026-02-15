from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from datetime import datetime, timedelta
from typing import Any, List, Annotated, Dict
from uuid import UUID
import json
from app.api.deps import get_db, require_permission, require_role, get_current_active_user
from app.db.models.user import User
from app.db.models.group import Group
from app.db.models.ticket import Ticket, TicketType
from app.db.models.alert import Alert
from app.db.models.asset import Asset
from app.db.models.asset_history import AssetEventLog
from app.db.models.location import LocationNode
from app.db.models.dashboard import DashboardConfig as DashboardModel
from app.schemas.dashboard import DashboardConfig, DashboardConfigCreate, DashboardConfigUpdate, WidgetConfig
from app.services.group_service import group_service
from app.services.ai_service import ai_service
router = APIRouter()
# --- Helpers ---
async def get_siem_type_ids(db: AsyncSession):
    res = await db.execute(select(TicketType.id).where(TicketType.name.ilike('%SIEM%')))
    return res.scalars().all()
@router.get("/stats")
async def get_dashboard_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
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
        has_assets_global = current_user.has_permission("assets:read:global")
        has_assets_group = current_user.has_permission("assets:read:group")
        if current_user.group_id:
            group_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
            ticket_filters.append(Ticket.group_id.in_(group_ids))
            if not has_assets_global:
                # Si solo tiene permiso de grupo, ve activos de su grupo o sin grupo (visibilidad compartida por ubicación)
                asset_filters.append(or_(Asset.owner_group_id.in_(group_ids), Asset.owner_group_id == None))
        else:
            ticket_filters.append(Ticket.id == None)
            if not has_assets_global:
                asset_filters.append(Asset.id == None)
    # --- SIEM CONDITION ---
    siem_condition = or_(
        Ticket.ticket_type_id.in_(siem_type_ids) if siem_type_ids else False,
        Ticket.title.ilike("%SOC%"),
        Ticket.title.ilike("%SIEM%"),
        Ticket.title.ilike("%ALERTA%")
    )
    # --- TICKETS STATS ---
    tickets_query = select(Ticket.status, func.count(Ticket.id)).where(
        and_(*ticket_filters, ~siem_condition)
    ).group_by(Ticket.status)
    res_tickets = await db.execute(tickets_query)
    t_data = {row.status: row.count for row in res_tickets}
    # --- SIEM STATS (ALERTAS REALES) ---
    siem_data = {"total": 0, "remediated": 0, "in_process": 0, "open": 0, "categories": [], "severity": {}, "latest": []}
    res_siem = await db.execute(select(Alert.status, func.count(Alert.id)).group_by(Alert.status))
    s_stats = {row.status: row.count for row in res_siem}
    siem_data["total"] = sum(s_stats.values())
    siem_data["remediated"] = s_stats.get("resolved", 0) + s_stats.get("closed", 0)
    siem_data["in_process"] = s_stats.get("in_progress", 0)
    siem_data["open"] = s_stats.get("new", 0) + s_stats.get("open", 0)
    # 1. Distribución por Severidad
    res_sev = await db.execute(select(Alert.severity, func.count(Alert.id)).group_by(Alert.severity))
    siem_data["severity"] = [{"name": row.severity.upper(), "value": row.count} for row in res_sev]
    # 2. Últimas 5 Alertas
    res_latest = await db.execute(select(Alert).order_by(Alert.created_at.desc()).limit(5))
    siem_data["latest"] = [
        {"id": str(a.id), "rule": a.rule_name[:30], "time": a.created_at.isoformat(), "sev": a.severity} 
        for a in res_latest.scalars().all()
    ]
    res_cats = await db.execute(
        select(Alert.rule_name, func.count(Alert.id).label("total_count"))
        .where(Alert.rule_name != None)
        .group_by(Alert.rule_name)
        .order_by(func.count(Alert.id).desc())
        .limit(5)
    )
    # Limpiar prefijos y asegurar mapeo correcto
    siem_data["categories"] = [
        {"name": r.rule_name.replace("SOC - PFA - ", "").replace("SOC - ", "")[:30], "count": r.total_count} 
        for r in res_cats
    ]

    # --- DISPOSITIVOS AFECTADOS (REVISIÓN MEJORADA) ---
    import re
    res_logs = await db.execute(select(Alert.raw_log).where(Alert.raw_log != None))
    logs = res_logs.scalars().all()
    dev_counts = {}
    for log in logs:
        # Intenta múltiples patrones: devname="...", hostName=..., src_ip=...
        patterns = [
            r'devname="([^"]+)"',
            r'devname=([^"\s,]+)',
            r'hostName="([^"]+)"',
            r'hostName=([^"\s,]+)',
            r'device="([^"]+)"'
        ]
        found = False
        for p in patterns:
            match = re.search(p, log, re.IGNORECASE)
            if match:
                dev = match.group(1).split('_')[0] # Simplificar nombres como PFA-cluster_FG10E0 a PFA-cluster
                dev_counts[dev] = dev_counts.get(dev, 0) + 1
                found = True
                break
        
        # Si es XML (FortiSIEM native), buscar en ruleType o similar si no hay devname
        if not found and '<?xml' in log:
            xml_match = re.search(r'ruleType="([^"]+)"', log)
            if xml_match:
                dev = "FortiSIEM"
                dev_counts[dev] = dev_counts.get(dev, 0) + 1
    
    top_devs = sorted(dev_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    siem_data["affected_devices"] = [{"name": name.upper(), "count": count} for name, count in top_devs]
    # --- ASSETS STATS ---
    res_assets = await db.execute(select(Asset.status, func.count(Asset.id)).where(and_(*asset_filters)).group_by(Asset.status))
    a_stats = {row.status: row.count for row in res_assets}
    loc_q = select(LocationNode.name, func.count(Asset.id)).join(Asset, Asset.location_node_id == LocationNode.id).where(
        and_(*asset_filters)
    ).group_by(LocationNode.name).order_by(func.count(Asset.id).desc()).limit(5)
    res_locs = await db.execute(loc_q)
    # 3. Top Analistas (Híbrido: Alertas SIEM Asignadas + Tickets)
    # Contamos alertas ACTIVAS
    res_alerts_active = await db.execute(
        select(User.username, func.count(Alert.id).label("total"))
        .join(Alert, Alert.assigned_to_id == User.id)
        .where(Alert.status.in_(['new', 'acknowledged', 'pending', 'open']))
        .group_by(User.username)
    )
    alerts_active = {r.username: r.total for r in res_alerts_active}

    # Contamos alertas RESUELTAS
    res_alerts_resolved = await db.execute(
        select(User.username, func.count(Alert.id).label("total"))
        .join(Alert, Alert.assigned_to_id == User.id)
        .where(Alert.status.in_(['resolved', 'closed', 'promoted']))
        .group_by(User.username)
    )
    alerts_resolved = {r.username: r.total for r in res_alerts_resolved}

    # Combinamos para el Top
    all_usernames = set(alerts_active.keys()) | set(alerts_resolved.keys())
    combined_stats = []
    for uname in all_usernames:
        active = alerts_active.get(uname, 0)
        resolved = alerts_resolved.get(uname, 0)
        combined_stats.append({
            "name": uname, 
            "active": active,
            "resolved": resolved,
            "total_score": active + resolved # Para el orden del ranking
        })
    
    top_analysts = sorted(combined_stats, key=lambda x: x["total_score"], reverse=True)[:5]

    # 4. Equipos con más incidencias (Híbrido: Tickets vinculados + Detecciones en Logs)
    res_top_assets = await db.execute(
        select(Asset.hostname, func.count(Ticket.id).label("total"))
        .join(Ticket, Ticket.asset_id == Asset.id)
        .where(and_(Ticket.deleted_at == None, Asset.deleted_at == None))
        .group_by(Asset.hostname)
        .order_by(func.count(Ticket.id).desc())
        .limit(5)
    )
    assets_with_tickets = [{"name": r.hostname, "count": r.total} for r in res_top_assets]
    
    # Si no hay vinculaciones manuales, usamos los datos de logs del SIEM para no dejar el widget vacío
    if not assets_with_tickets and siem_data["affected_devices"]:
        assets_with_tickets = siem_data["affected_devices"]
    
    # 5. Contador de cambios de estado a mantenimiento
    try:
        res_maint = await db.execute(
            select(func.count(AssetEventLog.id))
            .filter(
                AssetEventLog.event_type == 'status_change',
                AssetEventLog.description.ilike('%mantenimiento%')
            )
        )
        maintenance_count = res_maint.scalar() or 0
    except Exception:
        maintenance_count = 0
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
            "decommissioned": a_stats.get("decommissioned", 0),
            "by_location": [{"name": r.name, "count": r.count} for r in res_locs],
            "top_affected": assets_with_tickets,
            "maintenance_cycles": maintenance_count
        },
        "top_analysts": top_analysts
    }
@router.post("/ai-insights")
async def get_dashboard_insights(
    stats_data: dict,
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Usa IA para analizar los datos del dashboard y dar recomendaciones.
    """
    insight = await ai_service.predict_trends(stats_data)
    return {"insight": insight}
# --- Config Management (Opcional si usas el nuevo sistema) ---
@router.get("/config", response_model=DashboardConfig)
async def get_my_dashboard_config(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    res = await db.execute(
        select(DashboardModel).where(DashboardModel.user_id == current_user.id, DashboardModel.is_default == True)
    )
    config = res.scalar_one_or_none()
    if not config and current_user.group_id:
        res = await db.execute(
            select(DashboardModel).where(DashboardModel.group_id == current_user.group_id, DashboardModel.is_default == True)
        )
        config = res.scalar_one_or_none()
    if not config:
        res = await db.execute(
            select(DashboardModel).where(DashboardModel.user_id == None, DashboardModel.group_id == None, DashboardModel.is_default == True)
        )
        config = res.scalar_one_or_none()
    return config
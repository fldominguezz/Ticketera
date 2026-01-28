from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from datetime import datetime, timedelta
from typing import Any, List

from app.api.deps import get_db, get_current_active_user
from app.db.models.user import User
from app.db.models.ticket import Ticket, TicketType
from app.db.models.asset import Asset
from app.db.models.location import LocationNode

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    # --- RBAC Logic ---
    # Try to extract group name safely
    group_name = current_user.group.name if current_user.group else "General"
    
    # Check permissions (assuming they are loaded into a list of strings for easier checking)
    user_perms = []
    if current_user.roles:
        for ur in current_user.roles:
            if ur.role and ur.role.permissions:
                for rp in ur.role.permissions:
                    if rp.permission:
                        user_perms.append(rp.permission.name)
    
    # --- RBAC Logic ---
    # Try to extract group name safely
    group_name = current_user.group.name if current_user.group else "General"
    
    # Check permissions (assuming they are loaded into a list of strings for easier checking)
    user_perms = []
    if current_user.roles:
        for ur in current_user.roles:
            if ur.role and ur.role.permissions:
                for rp in ur.role.permissions:
                    if rp.permission:
                        user_perms.append(rp.permission.name)
    
    # Dashboard flags - STRICT SEGMENTATION
    # Only Division Seguridad or Superuser get global view
    is_division_seguridad = group_name == "División Seguridad Informática" or any(r.role.name == "División Seguridad Informática" for r in current_user.roles if r.role)
    
    can_view_global = current_user.is_superuser or is_division_seguridad
    
    # Other areas see their specific tools
    is_soc = group_name == "Área SOC" or any(r.role.name == "Área SOC" for r in current_user.roles if r.role)
    is_tecnica = group_name == "Área Técnica" or any(r.role.name == "Área Técnica" for r in current_user.roles if r.role)

    can_view_siem = is_soc or can_view_global or "dashboard:view_siem" in user_perms
    can_view_inventory = is_tecnica or can_view_global or "dashboard:view_inventory_stats" in user_perms

    # Get ALL SIEM-related Ticket Type IDs to exclude them from general stats
    siem_types_res = await db.execute(select(TicketType.id).where(TicketType.name.ilike('%SIEM%')))
    siem_type_ids = [row for row in siem_types_res.scalars().all()]

    # --- 1. Ticket Stats (Strictly User Tickets, EXCLUDING SIEM) ---
    ticket_filters = [Ticket.deleted_at == None]
    if siem_type_ids:
        ticket_filters.append(Ticket.ticket_type_id.notin_(siem_type_ids))
    
    # RESTRICTION: If not global view, only see own tickets (assigned or created)
    if not can_view_global:
        ticket_filters.append(
            or_(
                Ticket.assigned_to_id == current_user.id,
                Ticket.created_by_id == current_user.id
            )
        )
    
    status_query = select(
        Ticket.status,
        func.count(Ticket.id).label('count')
    ).where(and_(*ticket_filters)).group_by(Ticket.status)
    
    status_res = await db.execute(status_query)
    tickets_by_status = {row.status: row.count for row in status_res}
    
    # Calculate total of user-only tickets
    total_tickets = sum(tickets_by_status.values())

    # --- 2. SIEM Stats (Strictly Alert Metrics) ---
    siem_data = None
    if can_view_siem and siem_type_ids:
             # If not global, SOC only sees alerts they are involved in? 
             # No, standard SOC practice is to see all alerts of their area.
             # We assume SIEM tickets ARE the SOC domain.
             siem_filters = [Ticket.ticket_type_id.in_(siem_type_ids), Ticket.deleted_at == None]
             
             total_alerts = await db.execute(
                 select(func.count(Ticket.id))
                 .where(and_(*siem_filters))
             )
             
             alerts_status_res = await db.execute(
                 select(Ticket.status, func.count(Ticket.id))
                 .where(and_(*siem_filters))
                 .group_by(Ticket.status)
             )
             alerts_by_status = {row.status: row.count for row in alerts_status_res}
             
             remediated = alerts_by_status.get("resolved", 0) + alerts_by_status.get("closed", 0)
             in_process = alerts_by_status.get("in_progress", 0)
             open_alerts = alerts_by_status.get("open", 0)
             
             cat_query = select(
                Ticket.title,
                func.count(Ticket.id).label('count')
            ).where(
                and_(*siem_filters)
            ).group_by(Ticket.title).order_by(func.count(Ticket.id).desc()).limit(5)
            
             cat_res = await db.execute(cat_query)
             categories = [{"name": r.title.replace("SIEM: ", "")[:25], "count": r.count} for r in cat_res]
             
             siem_data = {
                 "total": total_alerts.scalar() or 0,
                 "remediated": remediated,
                 "in_process": in_process,
                 "open": open_alerts,
                 "categories": categories
             }

    # --- 3. Inventory Stats ---
    asset_data = None
    if can_view_inventory:
        asset_filters = [Asset.deleted_at == None]
        # Inventory is usually shared for the Technical area
        
        op_count = await db.execute(select(func.count(Asset.id)).where(and_(Asset.status == 'operative', *asset_filters)))
        pending_tag_count = await db.execute(select(func.count(Asset.id)).where(and_(Asset.status == 'tagging_pending', *asset_filters)))
        installing_count = await db.execute(select(func.count(Asset.id)).where(and_(Asset.status == 'installing', *asset_filters)))
        no_folder_count = await db.execute(select(func.count(Asset.id)).where(and_(Asset.location_node_id == None, *asset_filters)))
        
        loc_query = select(
            LocationNode.name,
            func.count(Asset.id).label('count')
        ).join(Asset, Asset.location_node_id == LocationNode.id)\
         .where(and_(*asset_filters))\
         .group_by(LocationNode.name)\
         .order_by(func.count(Asset.id).desc())\
         .limit(5)
         
        loc_res = await db.execute(loc_query)
        by_location = [{"name": r.name, "count": r.count} for r in loc_res]
        
        asset_data = {
            "operative": op_count.scalar() or 0,
            "pending_tagging": pending_tag_count.scalar() or 0,
            "installing": installing_count.scalar() or 0,
            "no_folder": no_folder_count.scalar() or 0,
            "by_location": by_location
        }

    return {
        "role": group_name,
        "is_global": can_view_global, # Front-end can use this to adjust UI further
        "tickets": {
            "total": total_tickets,
            "open": tickets_by_status.get("open", 0),
            "in_progress": tickets_by_status.get("in_progress", 0),
            "resolved": tickets_by_status.get("resolved", 0),
            "closed": tickets_by_status.get("closed", 0)
        },
        "siem": siem_data,
        "assets": asset_data
    }

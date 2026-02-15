from typing import List, Annotated, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_active_user
from app.db.models import User
from app.services.search_service import search_service
from app.schemas.search import SearchResponse, SearchHit
router = APIRouter()
@router.get("/", response_model=SearchResponse)
async def global_search(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    q: str = Query(..., min_length=1),
    limit: int = 10
):
    """
    Realiza una búsqueda global en el sistema (Tickets, Activos, Usuarios).
    """
    # 1. Búsqueda de Tickets
    ticket_results = search_service.search_tickets(q, limit=limit)
    hits = []
    
    for h in ticket_results.get("hits", []):
        hits.append(SearchHit(
            id=str(h.get("id")),
            title=f"Ticket: {h.get('title', 'Sin título')}",
            description=h.get("description", "")[:100],
            type="ticket",
            link=f"/tickets/{h.get('id')}",
            metadata={
                "status": h.get("status"),
                "priority": h.get("priority")
            }
        ))

    # 2. Búsqueda de Activos
    asset_results = search_service.search_assets(q, limit=limit)
    for h in asset_results.get("hits", []):
        hits.append(SearchHit(
            id=str(h.get("id")),
            title=f"Activo: {h.get('hostname', 'Sin Hostname')}",
            description=f"IP: {h.get('ip_address', '---')} | MAC: {h.get('mac_address', '---')}",
            type="asset",
            link=f"/inventory/{h.get('id')}",
            metadata={
                "status": h.get("status"),
                "ip": h.get("ip_address")
            }
        ))

    total = ticket_results.get("estimatedTotalHits", 0) + asset_results.get("estimatedTotalHits", 0)
    
    return SearchResponse(
        hits=hits[:limit], # Limit final results
        total=total,
        processing_time_ms=ticket_results.get("processingTimeMs", 0) + asset_results.get("processingTimeMs", 0),
        query=q
    )

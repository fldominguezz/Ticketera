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
    # Por ahora solo tickets en Meilisearch
    results = search_service.search_tickets(q, limit=limit)
    hits = []
    for h in results.get("hits", []):
        hits.append(SearchHit(
            id=str(h.get("id")),
            title=h.get("title", "Sin título"),
            description=h.get("description", ""),
            type="ticket",
            link=f"/tickets/{h.get('id')}",
            metadata={
                "status": h.get("status"),
                "priority": h.get("priority")
            }
        ))
    return SearchResponse(
        hits=hits,
        total=results.get("estimatedTotalHits", 0),
        processing_time_ms=results.get("processingTimeMs", 0),
        query=q
    )

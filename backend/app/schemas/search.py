from pydantic import BaseModel
from typing import List, Any, Dict, Optional
class SearchHit(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    type: str  # ticket, asset, user
    link: str
    metadata: Dict[str, Any] = {}
class SearchResponse(BaseModel):
    hits: List[SearchHit]
    total: int
    processing_time_ms: int
    query: str

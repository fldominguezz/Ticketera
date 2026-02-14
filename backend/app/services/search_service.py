import meilisearch
import os
import logging
from typing import List, Dict, Any, Optional
logger = logging.getLogger(__name__)
class SearchService:
    def __init__(self):
        self.url = os.getenv("MEILISEARCH_URL", "http://meilisearch:7700")
        self.key = os.getenv("MEILISEARCH_KEY", "masterKeyTicketeraSOC")
        self.client = None
        self.index_name = "tickets"
        # Initialization removed from __init__ to prevent blocking imports
    def _ensure_client(self):
        if self.client:
            return True
        try:
            self.client = meilisearch.Client(self.url, self.key)
            self._configure_index()
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Meilisearch client: {e}")
            self.client = None
            return False
    def _configure_index(self):
        if not self.client:
            return
        try:
            # Check if index exists, create if not
            try:
                self.client.get_index(self.index_name)
            except Exception:
                self.client.create_index(self.index_name, {"primaryKey": "id"})
            index = self.client.index(self.index_name)
            # Configure searchable attributes with priority
            index.update_searchable_attributes([
                "id",
                "title",
                "ticket_type",
                "description"
            ])
            # Configure filterable attributes for faceted search
            index.update_filterable_attributes([
                "status",
                "priority",
                "group_id",
                "assigned_to_id",
                "created_by_id",
                "ticket_type_id"
            ])
            # Configure sortable attributes
            index.update_sortable_attributes([
                "created_at",
                "updated_at"
            ])
            logger.info("Meilisearch 'tickets' index configured successfully.")
        except Exception as e:
            logger.error(f"Failed to configure Meilisearch index: {e}")
    def index_ticket(self, ticket_data: Dict[str, Any]):
        """
        Add or update a ticket in the search index.
        """
        if not self._ensure_client():
            return
        try:
            # Ensure dates are strings
            if ticket_data.get("created_at") and not isinstance(ticket_data["created_at"], str):
                 ticket_data["created_at"] = ticket_data["created_at"].isoformat()
            if ticket_data.get("updated_at") and not isinstance(ticket_data["updated_at"], str):
                 ticket_data["updated_at"] = ticket_data["updated_at"].isoformat()
            # Convert UUIDs to strings
            for key, value in ticket_data.items():
                if hasattr(value, "hex"): # Is UUID
                    ticket_data[key] = str(value)
            self.client.index(self.index_name).add_documents([ticket_data])
            logger.info(f"Indexed ticket {ticket_data.get('id')}")
        except Exception as e:
            logger.error(f"Failed to index ticket: {e}")
    def search_tickets(self, query: str, filters: Optional[str] = None, limit: int = 20, offset: int = 0) -> Dict[str, Any]:
        """
        Search for tickets.
        """
        if not self.client:
            self._ensure_client()
            if not self.client:
                return {"hits": [], "estimatedTotalHits": 0}
        try:
            search_params = {
                "limit": limit,
                "offset": offset,
            }
            if filters:
                search_params["filter"] = filters
            return self.client.index(self.index_name).search(query, search_params)
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return {"hits": [], "estimatedTotalHits": 0}
    def delete_ticket(self, ticket_id: str):
        if not self.client:
            return
        try:
            self.client.index(self.index_name).delete_document(ticket_id)
        except Exception as e:
            logger.error(f"Failed to delete ticket from index: {e}")
search_service = SearchService()

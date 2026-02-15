import meilisearch
import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
logger = logging.getLogger(__name__)
class SearchService:
    def __init__(self):
        self.url = os.getenv("MEILISEARCH_URL", "http://meilisearch:7700")
        self.key = os.getenv("MEILISEARCH_KEY", "masterKeyTicketeraSOC")
        self.client = None
        self.ticket_index = "tickets"
        self.asset_index = "assets"
        # Initialization removed from __init__ to prevent blocking imports
    def _ensure_client(self):
        if self.client:
            return True
        try:
            self.client = meilisearch.Client(self.url, self.key)
            self._configure_indexes()
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Meilisearch client: {e}")
            self.client = None
            return False

    def _configure_indexes(self):
        if not self.client:
            return
        try:
            # --- TICKETS INDEX ---
            try:
                self.client.get_index(self.ticket_index)
            except Exception:
                self.client.create_index(self.ticket_index, {"primaryKey": "id"})
            
            t_index = self.client.index(self.ticket_index)
            t_index.update_searchable_attributes(["id", "title", "ticket_type", "description"])
            t_index.update_filterable_attributes(["status", "priority", "group_id", "assigned_to_id", "created_by_id"])
            t_index.update_sortable_attributes(["created_at", "updated_at"])

            # --- ASSETS INDEX ---
            try:
                self.client.get_index(self.asset_index)
            except Exception:
                self.client.create_index(self.asset_index, {"primaryKey": "id"})
            
            a_index = self.client.index(self.asset_index)
            a_index.update_searchable_attributes([
                "hostname", 
                "ip_address", 
                "mac_address", 
                "serial", 
                "asset_tag", 
                "codigo_dependencia",
                "dependencia"
            ])
            a_index.update_filterable_attributes(["status", "criticality", "location_node_id", "device_type"])
            a_index.update_sortable_attributes(["hostname", "last_seen"])

            logger.info("Meilisearch indexes configured successfully.")
        except Exception as e:
            logger.error(f"Failed to configure Meilisearch indexes: {e}")

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
            self.client.index(self.ticket_index).add_documents([ticket_data])
            logger.info(f"Indexed ticket {ticket_data.get('id')}")
        except Exception as e:
            logger.error(f"Failed to index ticket: {e}")

    def index_asset(self, asset_data: Dict[str, Any]):
        """
        Add or update an asset in the search index.
        """
        if not self._ensure_client():
            return
        try:
            # Convert UUIDs to strings
            for key, value in asset_data.items():
                if hasattr(value, "hex"): # Is UUID
                    asset_data[key] = str(value)
                elif isinstance(value, datetime):
                    asset_data[key] = value.isoformat()
            
            self.client.index(self.asset_index).add_documents([asset_data])
            logger.info(f"Indexed asset {asset_data.get('hostname')} ({asset_data.get('id')})")
        except Exception as e:
            logger.error(f"Failed to index asset: {e}")

    def search_tickets(self, query: str, filters: Optional[str] = None, limit: int = 20, offset: int = 0) -> Dict[str, Any]:
        """
        Search for tickets.
        """
        if not self._ensure_client():
            return {"hits": [], "estimatedTotalHits": 0}
        try:
            search_params = {"limit": limit, "offset": offset}
            if filters:
                search_params["filter"] = filters
            return self.client.index(self.ticket_index).search(query, search_params)
        except Exception as e:
            logger.error(f"Ticket search failed: {e}")
            return {"hits": [], "estimatedTotalHits": 0}

    def search_assets(self, query: str, filters: Optional[str] = None, limit: int = 20, offset: int = 0) -> Dict[str, Any]:
        """
        Search for assets.
        """
        if not self._ensure_client():
            return {"hits": [], "estimatedTotalHits": 0}
        try:
            search_params = {"limit": limit, "offset": offset}
            if filters:
                search_params["filter"] = filters
            return self.client.index(self.asset_index).search(query, search_params)
        except Exception as e:
            logger.error(f"Asset search failed: {e}")
            return {"hits": [], "estimatedTotalHits": 0}

    def delete_ticket(self, ticket_id: str):
        if not self.client: return
        try:
            self.client.index(self.ticket_index).delete_document(ticket_id)
        except Exception as e:
            logger.error(f"Failed to delete ticket from index: {e}")

    def delete_asset(self, asset_id: str):
        if not self.client: return
        try:
            self.client.index(self.asset_index).delete_document(asset_id)
        except Exception as e:
            logger.error(f"Failed to delete asset from index: {e}")
search_service = SearchService()

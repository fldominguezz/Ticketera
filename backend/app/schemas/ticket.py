from pydantic import BaseModel, ConfigDict, model_validator
from uuid import UUID
from typing import Optional, Any, List, Dict
from datetime import datetime
class TicketBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "open"
    priority: Optional[str] = "medium"
    platform: Optional[str] = None
    ticket_type_id: UUID
    group_id: Optional[UUID] = None
    assigned_to_id: Optional[UUID] = None
    asset_id: Optional[UUID] = None
    location_id: Optional[UUID] = None
    parent_ticket_id: Optional[UUID] = None
    sla_deadline: Optional[datetime] = None
    is_private: Optional[bool] = False
    is_global: Optional[bool] = False
    extra_data: Optional[Dict[str, Any]] = None
class TicketCreate(TicketBase):
    attachment_ids: Optional[List[UUID]] = []
    asset_ids: Optional[List[UUID]] = []
    location_ids: Optional[List[UUID]] = []
class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    platform: Optional[str] = None
    assigned_to_id: Optional[UUID] = None
    group_id: Optional[UUID] = None
    is_private: Optional[bool] = None
    is_global: Optional[bool] = None
    extra_data: Optional[Any] = None
    asset_ids: Optional[List[UUID]] = None
    location_ids: Optional[List[UUID]] = None
class TicketInDBBase(TicketBase):
    id: UUID
    created_by_id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
class TicketTypeSchema(BaseModel):
    id: UUID
    name: str
    color: Optional[str] = None
    icon: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
class GroupSchema(BaseModel):
    id: UUID
    name: str
    model_config = ConfigDict(from_attributes=True)
class UserSchemaMinimal(BaseModel):
    id: UUID
    username: str
    first_name: str
    last_name: str
    avatar_url: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
class AssetSchemaMinimal(BaseModel):
    id: UUID
    hostname: str
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    asset_tag: Optional[str] = None
    location_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
class LocationSchemaMinimal(BaseModel):
    id: UUID
    name: str
    path: str
    model_config = ConfigDict(from_attributes=True)
class SLAMetricSchema(BaseModel):
    id: UUID
    response_deadline: Optional[datetime] = None
    resolution_deadline: Optional[datetime] = None
    responded_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    is_response_breached: bool = False
    is_resolution_breached: bool = False
    model_config = ConfigDict(from_attributes=True)
class AttachmentSchema(BaseModel):
    id: UUID
    filename: str
    size: Optional[int] = None
    content_type: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class WatcherSchema(BaseModel):
    id: UUID
    user_id: UUID
    username: str
    model_config = ConfigDict(from_attributes=True)

class Ticket(TicketInDBBase):
    ticket_type_name: Optional[str] = None
    group_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_by_name: Optional[str] = None
    has_attachments: bool = False
    # Objetos anidados para compatibilidad con frontend
    ticket_type: Optional[TicketTypeSchema] = None
    group: Optional[GroupSchema] = None
    assigned_to: Optional[UserSchemaMinimal] = None
    asset: Optional[AssetSchemaMinimal] = None
    location: Optional[LocationSchemaMinimal] = None
    locations: Optional[List[LocationSchemaMinimal]] = []
    sla_metric: Optional[SLAMetricSchema] = None
    attachments: Optional[List[AttachmentSchema]] = []
    watchers: Optional[List[WatcherSchema]] = []
    assets: Optional[List[AssetSchemaMinimal]] = []

    @model_validator(mode='before')
    @classmethod
    def flatten_relations(cls, data: Any) -> Any:
        # Funciones auxiliares para extraer datos
        def safe_getattr(obj, attr, default=None):
            try:
                return getattr(obj, attr)
            except Exception:
                return default
        if isinstance(data, dict):
            # Caso DICT (procesar datos ya serializados o model_dump)
            ticket_type = data.get("ticket_type")
            if ticket_type and not data.get("ticket_type_name"):
                data["ticket_type_name"] = getattr(ticket_type, "name", ticket_type.get("name") if isinstance(ticket_type, dict) else None)
            group = data.get("group")
            if group and not data.get("group_name"):
                data["group_name"] = getattr(group, "name", group.get("name") if isinstance(group, dict) else None)
            created_by = data.get("created_by")
            if created_by and not data.get("created_by_name"):
                c_first = getattr(created_by, "first_name", created_by.get("first_name") if isinstance(created_by, dict) else "")
                c_last = getattr(created_by, "last_name", created_by.get("last_name") if isinstance(created_by, dict) else "")
                name = f"{c_first} {c_last}".strip()
                data["created_by_name"] = name or getattr(created_by, "username", created_by.get("username") if isinstance(created_by, dict) else "Sistema")
            assigned_to = data.get("assigned_to")
            if assigned_to and not data.get("assigned_to_name"):
                first = getattr(assigned_to, "first_name", assigned_to.get("first_name") if isinstance(assigned_to, dict) else "")
                last = getattr(assigned_to, "last_name", assigned_to.get("last_name") if isinstance(assigned_to, dict) else "")
                data["assigned_to_name"] = f"{first} {last}".strip() or getattr(assigned_to, "username", assigned_to.get("username") if isinstance(assigned_to, dict) else None)
            if not data.get("assigned_to_id") and assigned_to:
                data["assigned_to_id"] = getattr(assigned_to, "id", assigned_to.get("id") if isinstance(assigned_to, dict) else None)
            return data
        if hasattr(data, "id"):
            # Caso OBJETO SQLAlchemy
            ticket_type = safe_getattr(data, "ticket_type")
            group = safe_getattr(data, "group")
            assigned_to = safe_getattr(data, "assigned_to")
            created_by = safe_getattr(data, "created_by")
            
            asset = safe_getattr(data, "asset")
            processed_asset = None
            if asset:
                asset_location = safe_getattr(asset, "location")
                processed_asset = {
                    "id": asset.id,
                    "hostname": asset.hostname,
                    "ip_address": asset.ip_address,
                    "mac_address": asset.mac_address,
                    "asset_tag": asset.asset_tag,
                    "location_name": asset_location.name if asset_location else "Sin Ubicación"
                }
            
            linked_assets = safe_getattr(data, "assets") or []
            processed_assets = []
            for a in linked_assets:
                a_loc = safe_getattr(a, "location")
                processed_assets.append({
                    "id": a.id,
                    "hostname": a.hostname,
                    "ip_address": a.ip_address,
                    "mac_address": a.mac_address,
                    "asset_tag": a.asset_tag,
                    "location_name": a_loc.name if a_loc else "Sin Ubicación"
                })
            
            location = safe_getattr(data, "location")
            linked_locations = safe_getattr(data, "locations") or []
            processed_locations = []
            for loc in linked_locations:
                processed_locations.append({
                    "id": loc.id,
                    "name": loc.name,
                    "path": loc.path
                })

            sla_metric = safe_getattr(data, "sla_metric")
            created_by = safe_getattr(data, "created_by")
            
            # LÓGICA DE GRUPO: Priorizar Global, luego el grupo asignado, luego el propietario
            group = safe_getattr(data, "group") or safe_getattr(data, "owner_group")
            group_name = group.name if group else "SOPORTE"
            
            if data.is_global:
                group_name = "GLOBAL"
            
            # LÓGICA UNIFICADA: Siempre priorizar Username para una visualización SOC limpia
            res_created_by_name = "Sistema"
            if created_by:
                res_created_by_name = getattr(created_by, "username", "Sistema")
            
            res_assigned_to_name = None
            if assigned_to:
                res_assigned_to_name = getattr(assigned_to, "username", None)
            
            attachments = safe_getattr(data, "attachments")
            watchers = safe_getattr(data, "watchers")
            has_attachments = len(attachments) > 0 if attachments else False
            
            return {
                "id": data.id,
                "title": data.title,
                "description": data.description,
                "status": data.status,
                "priority": data.priority,
                "platform": data.platform,
                "ticket_type_id": data.ticket_type_id,
                "ticket_type_name": ticket_type.name if ticket_type else "General",
                "ticket_type": ticket_type if ticket_type else None,
                "group_id": data.group_id or data.owner_group_id,
                "group_name": group.name if group else "SOPORTE",
                "group": group if group else None,
                "asset_id": data.asset_id,
                "asset": processed_asset,
                "assets": processed_assets,
                "location_id": data.location_id,
                "location": location if location else None,
                "locations": processed_locations,
                "is_global": data.is_global,
                "sla_metric": sla_metric if sla_metric else None,
                "created_by_id": data.created_by_id,
                "created_by_name": res_created_by_name,
                "assigned_to_id": data.assigned_to_id,
                "assigned_to_name": res_assigned_to_name,
                "assigned_to": assigned_to if assigned_to else None,
                "parent_ticket_id": data.parent_ticket_id,
                "sla_deadline": data.sla_deadline,
                "is_private": data.is_private,
                "extra_data": data.extra_data,
                "has_attachments": has_attachments,
                "attachments": attachments if attachments else [],
                "watchers": watchers if watchers else [],
                "created_at": data.created_at,
                "updated_at": data.updated_at,
                "closed_at": data.closed_at,
                "deleted_at": data.deleted_at
            }
        return data
class TicketCommentBase(BaseModel):
    content: str
    is_internal: bool = False
class TicketCommentCreate(TicketCommentBase):
    pass
class TicketComment(TicketCommentBase):
    id: UUID
    ticket_id: UUID
    user_id: UUID
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
class TicketRelationCreate(BaseModel):
    target_ticket_id: UUID
    relation_type: str # relates_to, blocks, blocked_by, duplicate_of
class TicketRelation(TicketRelationCreate):
    id: UUID
    source_ticket_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
class TicketBulkUpdate(BaseModel):
    ticket_ids: List[UUID]
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to_id: Optional[UUID] = None
class TicketSubtaskBase(BaseModel):
    title: str
    is_completed: bool = False
class TicketSubtaskCreate(TicketSubtaskBase):
    pass
class TicketSubtaskUpdate(BaseModel):
    title: Optional[str] = None
    is_completed: Optional[bool] = None
class TicketSubtask(TicketSubtaskBase):
    id: UUID
    ticket_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
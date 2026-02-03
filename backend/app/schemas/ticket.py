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
    group_id: UUID
    asset_id: Optional[UUID] = None
    parent_ticket_id: Optional[UUID] = None
    sla_deadline: Optional[datetime] = None
    extra_data: Optional[Dict[str, Any]] = None

class TicketCreate(TicketBase):
    attachment_ids: Optional[List[UUID]] = []

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    platform: Optional[str] = None
    assigned_to_id: Optional[UUID] = None
    group_id: Optional[UUID] = None
    extra_data: Optional[Any] = None

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
    model_config = ConfigDict(from_attributes=True)

class AssetSchemaMinimal(BaseModel):
    id: UUID
    hostname: str
    ip_address: Optional[str] = None
    asset_tag: Optional[str] = None
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

class Ticket(TicketInDBBase):
    ticket_type_name: Optional[str] = None
    group_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    
    # Objetos anidados para compatibilidad con frontend
    ticket_type: Optional[TicketTypeSchema] = None
    group: Optional[GroupSchema] = None
    assigned_to: Optional[UserSchemaMinimal] = None
    asset: Optional[AssetSchemaMinimal] = None
    sla_metric: Optional[SLAMetricSchema] = None

    @model_validator(mode='before')
    @classmethod
    def flatten_relations(cls, data: Any) -> Any:
        if hasattr(data, "id") and not isinstance(data, dict):
            # Si es un objeto de SQLAlchemy
            def safe_getattr(obj, attr, default=None):
                try:
                    return getattr(obj, attr)
                except Exception:
                    return default

            ticket_type = safe_getattr(data, "ticket_type")
            group = safe_getattr(data, "group")
            assigned_to = safe_getattr(data, "assigned_to")
            asset = safe_getattr(data, "asset")
            sla_metric = safe_getattr(data, "sla_metric")

            return {
                "id": data.id,
                "title": data.title,
                "description": data.description,
                "status": data.status,
                "priority": data.priority,
                "platform": data.platform,
                "ticket_type_id": data.ticket_type_id,
                "ticket_type_name": ticket_type.name if ticket_type else None,
                "ticket_type": ticket_type if ticket_type else None,
                "group_id": data.group_id,
                "group_name": group.name if group else None,
                "group": group if group else None,
                "asset_id": data.asset_id,
                "asset": asset if asset else None,
                "sla_metric": sla_metric if sla_metric else None,
                "created_by_id": data.created_by_id,
                "assigned_to_id": data.assigned_to_id,
                "assigned_to_name": f"{assigned_to.first_name} {assigned_to.last_name}" if assigned_to else None,
                "assigned_to": assigned_to if assigned_to else None,
                "parent_ticket_id": data.parent_ticket_id,
                "sla_deadline": data.sla_deadline,
                "extra_data": data.extra_data,
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

from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON, Integer, Table, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base_class import Base
# Association table for tickets and endpoints (M2M)
ticket_endpoints = Table(
    "ticket_endpoints",
    Base.metadata,
    Column("ticket_id", UUID(as_uuid=True), ForeignKey("tickets.id"), primary_key=True),
    Column("endpoint_id", UUID(as_uuid=True), ForeignKey("endpoints.id"), primary_key=True),
)

# Association table for tickets and assets (M2M)

ticket_assets = Table(

    "ticket_assets",

    Base.metadata,

    Column("ticket_id", UUID(as_uuid=True), ForeignKey("tickets.id"), primary_key=True),

    Column("asset_id", UUID(as_uuid=True), ForeignKey("assets.id"), primary_key=True),

)



# Association table for tickets and locations (M2M)

ticket_locations = Table(

    "ticket_locations",

    Base.metadata,

    Column("ticket_id", UUID(as_uuid=True), ForeignKey("tickets.id"), primary_key=True),

    Column("location_id", UUID(as_uuid=True), ForeignKey("location_nodes.id"), primary_key=True),

)



class TicketType(Base):
    __tablename__ = "ticket_types"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255))
    icon = Column(String(50)) 
    color = Column(String(20))
    requires_sla = Column(Boolean, default=True)
    has_severity = Column(Boolean, default=True)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflows.id"), nullable=True)
    workflow = relationship("Workflow")
class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="open")
    priority = Column(String(50), default="medium")
    platform = Column(String(100), nullable=True)
    ticket_type_id = Column(UUID(as_uuid=True), ForeignKey("ticket_types.id"), nullable=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=True) # Current Group - Nullable for private
    owner_group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False) # Creator's Group
    location_id = Column(UUID(as_uuid=True), ForeignKey("location_nodes.id"), nullable=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=True)
    expediente_id = Column(UUID(as_uuid=True), ForeignKey("expedientes.id"), nullable=True)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    parent_ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=True)
    template_id = Column(UUID(as_uuid=True), ForeignKey("forms.id"), nullable=True)
    sla_deadline = Column(DateTime(timezone=True), nullable=True)
    is_private = Column(Boolean, default=False)
    is_global = Column(Boolean, default=False)
    extra_data = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    # Relaciones
    ticket_type = relationship("TicketType")
    group = relationship("Group", foreign_keys=[group_id], back_populates="tickets")
    owner_group = relationship("Group", foreign_keys=[owner_group_id], back_populates="owned_tickets")
    location = relationship("LocationNode")
    asset = relationship("Asset")
    expediente = relationship("Expediente")
    created_by = relationship("User", foreign_keys=[created_by_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    parent_ticket = relationship("Ticket", remote_side=[id], back_populates="subtickets")
    subtickets = relationship("Ticket", back_populates="parent_ticket")
    comments = relationship("TicketComment", back_populates="ticket", cascade="all, delete-orphan")
    watchers = relationship("TicketWatcher", back_populates="ticket", cascade="all, delete-orphan")
    endpoints = relationship("Endpoint", secondary=ticket_endpoints)
    assets = relationship("Asset", secondary=ticket_assets)
    locations = relationship("LocationNode", secondary=ticket_locations)
    sla_metric = relationship("SLAMetric", back_populates="ticket", uselist=False, cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="ticket")
    def __repr__(self):
        return f"<Ticket(title='{self.title}', status='{self.status}')>"
class TicketComment(Base):
    __tablename__ = "ticket_comments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    ticket = relationship("Ticket", back_populates="comments")
    user = relationship("User")
class TicketRelation(Base):
    __tablename__ = "ticket_relations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False)
    target_ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False)
    relation_type = Column(String(50), nullable=False) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    source_ticket = relationship("Ticket", foreign_keys=[source_ticket_id], backref="relations_out")
    target_ticket = relationship("Ticket", foreign_keys=[target_ticket_id], backref="relations_in")
class TicketSubtask(Base):
    __tablename__ = "ticket_subtasks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False)
    title = Column(String(255), nullable=False)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ticket = relationship("Ticket", backref="subtasks_list")
class TicketWatcher(Base):
    __tablename__ = "ticket_watchers"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ticket = relationship("Ticket", back_populates="watchers")
    user = relationship("User")

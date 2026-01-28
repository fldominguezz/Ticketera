from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON, Integer, Table, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base_class import Base

# Association table for tickets and endpoints (M2M) - Legacy keeping for compatibility
ticket_endpoints = Table(
    "ticket_endpoints",
    Base.metadata,
    Column("ticket_id", UUID(as_uuid=True), ForeignKey("tickets.id"), primary_key=True),
    Column("endpoint_id", UUID(as_uuid=True), ForeignKey("endpoints.id"), primary_key=True),
)

class TicketType(Base):
    __tablename__ = "ticket_types"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False) # Instalación, Alerta SIEM, Incidente, etc.
    description = Column(String(255))
    icon = Column(String(50)) 
    color = Column(String(20)) 

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    status = Column(String(50), default="open") # open, in_progress, pending, resolved, closed
    priority = Column(String(50), default="medium") # low, medium, high, critical
    platform = Column(String(100), nullable=True) # Forti-EMS, ESET CLOUD, etc.
    
    ticket_type_id = Column(UUID(as_uuid=True), ForeignKey("ticket_types.id"), nullable=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=True)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    parent_ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=True)
    sla_deadline = Column(DateTime(timezone=True), nullable=True)
    extra_data = Column(JSON, nullable=True)

    # SOC / SIEM Alert Enrichment
    raw_event = Column(Text, nullable=True)
    parsed_event = Column(JSON, nullable=True)
    enrichment = Column(JSON, nullable=True)
    remediation_suggestions = Column(JSON, nullable=True) # Array of steps/markdown
    siem_metadata = Column(JSON, nullable=True) # rule, mitre, original_sev
    final_severity = Column(String(20), nullable=True) # LOW, MEDIUM, HIGH, CRITICAL
    correlation_tags = Column(JSON, nullable=True) # []

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relaciones
    ticket_type = relationship("TicketType")
    group = relationship("Group", back_populates="tickets")
    asset = relationship("Asset")
    created_by = relationship("User", foreign_keys=[created_by_id], back_populates="tickets_created")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], back_populates="tickets_assigned")
    
    parent_ticket = relationship("Ticket", remote_side=[id], back_populates="subtickets")
    subtickets = relationship("Ticket", back_populates="parent_ticket")
    
    comments = relationship("TicketComment", back_populates="ticket", cascade="all, delete-orphan")
    endpoints = relationship("Endpoint", secondary=ticket_endpoints)

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
    relation_type = Column(String(50), nullable=False) # relates_to, blocks, blocked_by, duplicate_of, parent_of
    
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

    ticket = relationship("Ticket", backref="subtasks")

class TicketWatcher(Base):
    __tablename__ = "ticket_watchers"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    ticket = relationship("Ticket", backref="watchers")
    user = relationship("User")

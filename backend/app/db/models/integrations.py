from sqlalchemy import Column, String, JSON, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base_class import Base
class SIEMRule(Base):
    __tablename__ = "siem_rules"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    event_pattern = Column(String(255), nullable=False) # e.g., "Logon_Failure"
    min_severity = Column(String(50), default="high")
    # Action configuration
    auto_create_ticket = Column(Boolean, default=True)
    ticket_priority = Column(String(50), default="high")
    assign_to_group_id = Column(UUID(as_uuid=True), nullable=True)
    is_active = Column(Boolean, default=True)
    def __repr__(self):
        return f"<SIEMRule(name='{self.name}', pattern='{self.event_pattern}')>"
class SIEMEvent(Base):
    __tablename__ = "siem_events"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    raw_data = Column(JSON, nullable=False)
    source_ip = Column(String(50), nullable=True)
    event_type = Column(String(100), nullable=True)
    severity = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed = Column(Boolean, default=False)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=True)
    ticket = relationship("Ticket")
    def __repr__(self):
        return f"<SIEMEvent(id='{self.id}', type='{self.event_type}')>"
class SIEMConfiguration(Base):
    __tablename__ = "siem_configuration"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    siem_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    default_group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=True)
    ticket_type_id = Column(UUID(as_uuid=True), ForeignKey("ticket_types.id"), nullable=True)
    api_username = Column(String(255), nullable=False)
    api_password = Column(String(255), nullable=True)
    allowed_ips = Column(String(255), default="10.1.78.10,127.0.0.1")
    is_active = Column(Boolean, default=True)
    last_test_status = Column(String(50), nullable=True)
    last_error_message = Column(String(500), nullable=True)
    last_test_at = Column(DateTime(timezone=True), nullable=True)
    siem_user = relationship("User", foreign_keys=[siem_user_id])
    default_group = relationship("Group", foreign_keys=[default_group_id])

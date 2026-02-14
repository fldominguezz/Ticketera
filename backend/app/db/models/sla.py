from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, JSON, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.db.base_class import Base
class SLAPolicy(Base):
    __tablename__ = "sla_policies"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(String(255))
    # Scope of the policy
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=True)
    ticket_type_id = Column(UUID(as_uuid=True), ForeignKey("ticket_types.id"), nullable=True)
    priority = Column(String(50), nullable=False) # low, medium, high, critical
    # Time goals in minutes
    response_time_goal = Column(Integer, nullable=False) 
    resolution_time_goal = Column(Integer, nullable=False)
    # Business hours configuration (e.g., {"mon": ["09:00", "18:00"], ...})
    business_hours = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    group = relationship("Group")
    ticket_type = relationship("TicketType")
    def __repr__(self):
        return f"<SLAPolicy(name='{self.name}', priority='{self.priority}')>"
class SLAMetric(Base):
    __tablename__ = "sla_metrics"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False)
    policy_id = Column(UUID(as_uuid=True), ForeignKey("sla_policies.id"), nullable=False)
    # Goals at the time of ticket creation
    response_deadline = Column(DateTime(timezone=True))
    resolution_deadline = Column(DateTime(timezone=True))
    # Actual fulfillment
    responded_at = Column(DateTime(timezone=True))
    resolved_at = Column(DateTime(timezone=True))
    is_response_breached = Column(Boolean, default=False)
    is_resolution_breached = Column(Boolean, default=False)
    ticket = relationship("Ticket", back_populates="sla_metric")
    policy = relationship("SLAPolicy")
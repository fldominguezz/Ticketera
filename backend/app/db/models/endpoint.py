from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base_class import Base

class Endpoint(Base):
    __tablename__ = "endpoints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hostname = Column(String(255), nullable=False)
    ip_address = Column(String(50), nullable=True)
    mac_address = Column(String(50), nullable=True)
    
    # "división/lugar" maps to group_id for hierarchy and visibility
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    
    product = Column(String(100), nullable=True) # e.g., ESET, FortiEDR
    status = Column(String(50), default="active") # active, inactive, decommissioned
    
    technical_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    observations = Column(Text, nullable=True)
    extra_data = Column(JSON, nullable=True) # For any other dynamic fields

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relaciones
    group = relationship("Group", back_populates="endpoints")
    responsible_technician = relationship("User", back_populates="endpoints")
    # tickets = relationship("Ticket", secondary="ticket_endpoints", back_populates="endpoints")
    # forms = relationship("FormSubmission", back_populates="endpoint")

    def __repr__(self):
        return f"<Endpoint(hostname='{self.hostname}', ip='{self.ip_address}')>"

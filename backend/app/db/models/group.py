from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base_class import Base

class Group(Base):
    __tablename__ = "groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    dashboard_layout = Column(JSONB, default=list, nullable=False)

    # Relaciones
    parent_group = relationship("Group", remote_side=[id], back_populates="child_groups")
    
    child_groups = relationship("Group", back_populates="parent_group")
    users = relationship("User", back_populates="group")
    # user_role_groups = relationship("UserRoleGroup", back_populates="group")
    endpoints = relationship("Endpoint", back_populates="group")
    assets = relationship("Asset", back_populates="owner_group")
    locations = relationship("LocationNode", back_populates="owner_group")
    # forms = relationship("Form", back_populates="group")
    # form_submissions = relationship("FormSubmission", back_populates="group")
    tickets = relationship("Ticket", foreign_keys="[Ticket.group_id]", back_populates="group")
    owned_tickets = relationship("Ticket", foreign_keys="[Ticket.owner_group_id]", back_populates="owner_group")

    def __repr__(self):
        return f"<Group(name='{self.name}')>"

from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base_class import Base
class Form(Base):
    __tablename__ = "forms"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    is_production = Column(Boolean, default=False)
    category = Column(String(50), nullable=True) # 'ticket_creation', etc.
    system_slug = Column(String(50), unique=True, nullable=True) # 'ticket-standard', 'asset-install'
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    # Configuration of the form (visual builder state)
    fields_schema = Column(JSON, nullable=False) # Stores fields, validations, conditionals
    # Automation rules: What happens when this form is submitted?
    # e.g., create ticket type X, create endpoint Y
    automation_rules = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    group = relationship("Group")
    created_by = relationship("User")
    submissions = relationship("FormSubmission", back_populates="form")
class FormSubmission(Base):
    __tablename__ = "form_submissions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    form_id = Column(UUID(as_uuid=True), ForeignKey("forms.id"), nullable=False)
    submitted_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    # Inmutable record of the submission
    data = Column(JSON, nullable=False)
    # Links to objects created by this submission
    created_ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=True)
    created_endpoint_id = Column(UUID(as_uuid=True), ForeignKey("endpoints.id"), nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    form = relationship("Form", back_populates="submissions")
    submitted_by = relationship("User")
    group = relationship("Group")
    ticket = relationship("Ticket")
    endpoint = relationship("Endpoint")

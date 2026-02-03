from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base_class import Base

class DailyReport(Base):
    __tablename__ = "daily_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    date = Column(Date, nullable=False, index=True)
    shift = Column(String, nullable=False)  # "DIA" or "NOCHE"
    
    # Path to the generated/uploaded DOCX file
    file_path = Column(String, nullable=False)
    
    # Full extracted text for searching
    search_content = Column(Text, nullable=True)
    
    # Structured data for future use (health status, license counts, etc.)
    report_data = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=True)
    owner_group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=True)

    # Relationships
    group = relationship("Group", foreign_keys=[group_id])
    owner_group = relationship("Group", foreign_keys=[owner_group_id])
    created_by = relationship("User")

class GroupTemplate(Base):
    __tablename__ = "group_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), unique=True, nullable=False)
    template_path = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

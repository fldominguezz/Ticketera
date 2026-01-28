from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
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

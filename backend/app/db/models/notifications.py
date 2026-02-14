from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base_class import Base

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String(255), nullable=True) # URL to redirect when clicked
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")

class Attachment(Base):
    __tablename__ = "attachments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=True)
    comment_id = Column(UUID(as_uuid=True), ForeignKey("ticket_comments.id"), nullable=True)
    uploaded_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    content_type = Column(String(100), nullable=True)
    size = Column(Integer, nullable=True) # in bytes
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    ticket = relationship("Ticket", back_populates="attachments")
    comment = relationship("TicketComment")
    uploader = relationship("User")

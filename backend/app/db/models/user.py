from sqlalchemy import Column, String, Boolean, DateTime, Text, ARRAY, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    preferred_language = Column(String(5), default="es") # es, en, fr, it
    
    # 2FA and Security
    is_2fa_enabled = Column(Boolean, default=False, nullable=False)
    totp_secret = Column(String(255), nullable=True)
    recovery_codes = Column(ARRAY(Text), nullable=True)
    
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relaciones
    group = relationship("Group", back_populates="users")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    endpoints = relationship("Endpoint", back_populates="responsible_technician")
    # forms = relationship("Form", back_populates="created_by")
    # form_versions = relationship("FormVersion", back_populates="created_by")
    # form_submissions = relationship("FormSubmission", back_populates="submitted_by")
    tickets_created = relationship("Ticket", foreign_keys="[Ticket.created_by_id]", back_populates="created_by")
    tickets_assigned = relationship("Ticket", foreign_keys="[Ticket.assigned_to_id]", back_populates="assigned_to")
    # ticket_comments = relationship("TicketComment", back_populates="user")
    # comment_history = relationship("CommentHistory", back_populates="edited_by")
    # attachments = relationship("Attachment", back_populates="uploaded_by")
    # fortisiem_rules = relationship("FortiSIEMRule", back_populates="created_by")

    def __repr__(self):
        return f"<User(username='{self.username}', email='{self.email}')>"

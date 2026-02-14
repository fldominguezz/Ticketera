from sqlalchemy import Column, String, Boolean, DateTime, Text, ARRAY, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base_class import Base

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
    
    force_password_change = Column(Boolean, default=False, nullable=False)
    reset_2fa_next_login = Column(Boolean, default=False, nullable=False)
    enroll_2fa_mandatory = Column(Boolean, default=False, nullable=False)
    policy_exempt = Column(Boolean, default=False, nullable=False)
    avatar_url = Column(String(512), nullable=True)
    dashboard_layout = Column(JSONB, default=list, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relaciones
    group = relationship("Group", back_populates="users")
    
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    endpoints = relationship("Endpoint", back_populates="responsible_technician")
    assets = relationship("Asset", back_populates="responsible_user")
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

    def get_permissions(self) -> set:
        perms = set()
        # Ensure roles are loaded
        if self.roles:
            for user_role in self.roles:
                if user_role.role and user_role.role.permissions:
                    for role_perm in user_role.role.permissions:
                        if role_perm.permission:
                            perms.add(role_perm.permission.key)
        return perms

    def has_permission(self, perm_key: str) -> bool:
        if self.is_superuser: return True
        return perm_key in self.get_permissions()

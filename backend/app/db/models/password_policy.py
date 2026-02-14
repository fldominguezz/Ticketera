from sqlalchemy import Column, Integer, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.db.base_class import Base
class PasswordPolicy(Base):
    """
    Stores the password policy for the application.
    For simplicity, we'll start with a single row in this table for the global policy.
    """
    __tablename__ = "password_policies"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    min_length = Column(Integer, default=12, nullable=False)
    requires_uppercase = Column(Boolean, default=True, nullable=False)
    requires_lowercase = Column(Boolean, default=True, nullable=False)
    requires_number = Column(Boolean, default=True, nullable=False)
    requires_special_char = Column(Boolean, default=True, nullable=False)
    # Expiration in days. If null, passwords do not expire.
    expire_days = Column(Integer, nullable=True)
    enforce_2fa_all = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    def __repr__(self):
        return f"<PasswordPolicy(min_length={self.min_length})>"

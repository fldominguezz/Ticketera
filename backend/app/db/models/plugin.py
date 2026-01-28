from sqlalchemy import Column, String, Boolean, JSON, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.db.base_class import Base

class Plugin(Base):
    __tablename__ = "plugins"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255))
    version = Column(String(20))
    is_active = Column(Boolean, default=False)
    config = Column(JSON, nullable=True) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())

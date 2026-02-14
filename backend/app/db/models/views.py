from sqlalchemy import Column, String, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.db.base_class import Base
class SavedView(Base):
    __tablename__ = "saved_views"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    filters = Column(JSON, nullable=False) # Stores {status: 'open', priority: 'high', etc}
    icon = Column(String(50), default="Filter")
    def __repr__(self):
        return f"<SavedView(name='{self.name}', user='{self.user_id}')>"

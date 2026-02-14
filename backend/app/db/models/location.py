from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base_class import Base
class LocationNode(Base):
    __tablename__ = "location_nodes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("location_nodes.id"), nullable=True)
    name = Column(String(255), nullable=False)
    dependency_code = Column(String(50), unique=True, nullable=True)
    path = Column(Text, nullable=False, unique=True) # Materialized path e.g., "Division/Edificio/Piso1"
    owner_group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=True)
    # Permissions could be a JSON field or related table, simplified here as JSON or just owner_group ownership
    permissions = Column(Text, nullable=True) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    # Relationships
    parent = relationship("LocationNode", remote_side=[id], back_populates="children")
    children = relationship("LocationNode", back_populates="parent")
    owner_group = relationship("Group", back_populates="locations")
    assets = relationship("Asset", back_populates="location")
    def __repr__(self):
        return f"<LocationNode(path='{self.path}')>"

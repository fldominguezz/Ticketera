from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base import Base

class Asset(Base):
    __tablename__ = "assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Identification
    hostname = Column(String(255), nullable=False, index=True)
    serial = Column(String(100), nullable=True, index=True)
    asset_tag = Column(String(100), nullable=True, index=True)
    mac_address = Column(String(50), nullable=True, index=True)
    ip_address = Column(String(50), nullable=True) # Current IP
    
    # Organization
    location_node_id = Column(UUID(as_uuid=True), ForeignKey("location_nodes.id"), nullable=True)
    division = Column(String(100), nullable=True) # Can be derived from location or explicit
    owner_group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=True)
    responsible_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # State
    status = Column(String(50), default="operative") # operative, decommissioned, installing, maintenance
    criticality = Column(String(50), default="medium") # low, medium, high, critical
    
    # Security / Specs
    av_product = Column(String(100), nullable=True) # ESET, FortiEDR, etc.
    source_system = Column(String(50), default="manual") # manual, ESET, FortiSIEM, etc.
    external_id = Column(String(255), nullable=True) # ID in external system
    last_seen = Column(DateTime(timezone=True), nullable=True)
    
    # System Specs (from forms)
    device_type = Column(String(50), nullable=True) # desktop, notebook, server
    os_name = Column(String(100), nullable=True)
    os_version = Column(String(100), nullable=True)
    
    observations = Column(Text, nullable=True) # Mandatory in logic, nullable in DB to support partial creation

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    location = relationship("LocationNode", back_populates="assets")
    owner_group = relationship("Group", back_populates="assets")
    responsible_user = relationship("User", back_populates="assets")
    
    location_history = relationship("AssetLocationHistory", back_populates="asset")
    install_records = relationship("AssetInstallRecord", back_populates="asset")
    ip_history = relationship("AssetIPHistory", back_populates="asset")

    def __repr__(self):
        return f"<Asset(hostname='{self.hostname}', asset_tag='{self.asset_tag}')>"

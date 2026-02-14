from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base_class import Base
# Association table
asset_expedientes = Table(
    "asset_expedientes",
    Base.metadata,
    Column("asset_id", UUID(as_uuid=True), ForeignKey("assets.id"), primary_key=True),
    Column("expediente_id", UUID(as_uuid=True), ForeignKey("expedientes.id"), primary_key=True),
)
class Asset(Base):
    __tablename__ = "assets"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hostname = Column(String(255), nullable=False, index=True)
    serial = Column(String(100), nullable=True, index=True)
    asset_tag = Column(String(100), nullable=True, index=True)
    mac_address = Column(String(50), nullable=True, index=True)
    ip_address = Column(String(50), nullable=True)
    location_node_id = Column(UUID(as_uuid=True), ForeignKey("location_nodes.id"), nullable=True)
    dependencia = Column(String(255), nullable=True)
    codigo_dependencia = Column(String(50), nullable=True)
    owner_group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=True)
    responsible_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status = Column(String(50), default="operative")
    criticality = Column(String(50), default="medium")
    av_product = Column(String(100), nullable=True)
    device_type = Column(String(100), nullable=True)
    os_name = Column(String(100), nullable=True)
    os_version = Column(String(100), nullable=True)
    observations = Column(Text, nullable=True)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    location = relationship("LocationNode", back_populates="assets")
    owner_group = relationship("Group", back_populates="assets")
    responsible_user = relationship("User", back_populates="assets")
    expedientes = relationship("Expediente", secondary=asset_expedientes)
    location_history = relationship("AssetLocationHistory", back_populates="asset")
    install_records = relationship("AssetInstallRecord", back_populates="asset")
    ip_history = relationship("AssetIPHistory", back_populates="asset")
    event_logs = relationship("AssetEventLog", back_populates="asset")
    def __repr__(self):
        return f"<Asset(hostname='{self.hostname}')>"

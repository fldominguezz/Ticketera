from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base_class import Base
class AssetLocationHistory(Base):
    __tablename__ = "asset_location_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)
    previous_location_id = Column(UUID(as_uuid=True), ForeignKey("location_nodes.id"), nullable=True)
    new_location_id = Column(UUID(as_uuid=True), ForeignKey("location_nodes.id"), nullable=False)
    changed_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    asset = relationship("Asset", back_populates="location_history")
    previous_location = relationship("LocationNode", foreign_keys=[previous_location_id])
    new_location = relationship("LocationNode", foreign_keys=[new_location_id])
    changed_by = relationship("User")
class AssetIPHistory(Base):
    __tablename__ = "asset_ip_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)
    ip_address = Column(String(50), nullable=False)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    source = Column(String(50), nullable=True)
    asset = relationship("Asset", back_populates="ip_history")
class AssetInstallRecord(Base):
    __tablename__ = "asset_install_records"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)
    gde_number = Column(String(100), nullable=True)
    tecnico_instalacion = Column(String(255), nullable=True)
    tecnico_carga = Column(String(255), nullable=True)
    install_details = Column(JSON, nullable=True)
    snapshot_url = Column(String(500), nullable=True)
    observations = Column(Text, nullable=True)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    asset = relationship("Asset", back_populates="install_records")
    created_by = relationship("User")
class AssetEventLog(Base):
    __tablename__ = "asset_event_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)
    event_type = Column(String(50), nullable=False) # 'move', 'status_change', 'ticket_created', 'expediente_linked'
    description = Column(String(500), nullable=False)
    details = Column(JSON, nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    asset = relationship("Asset", back_populates="event_logs")
    user = relationship("User")


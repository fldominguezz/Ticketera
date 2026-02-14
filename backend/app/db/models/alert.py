from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base_class import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_id = Column(String(100), nullable=True, index=True)
    rule_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(50), nullable=False)
    
    source_ip = Column(String(50), nullable=True)
    target_host = Column(String(255), nullable=True)
    
    raw_log = Column(Text, nullable=True)
    extra_data = Column(JSON, nullable=True)
    
    status = Column(String(50), default="new") # new, acknowledged, resolved, promoted
    
    # Análisis de IA persistente
    ai_summary = Column(Text, nullable=True)
    ai_remediation = Column(Text, nullable=True)
    
    # Si la alerta se convierte en Ticket, guardamos la relación
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relaciones
    ticket = relationship("Ticket", backref="source_alerts")
    acknowledged_by = relationship("User", foreign_keys=[acknowledged_by_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])

    def __repr__(self):
        return f"<Alert(rule='{self.rule_name}', severity='{self.severity}')>"

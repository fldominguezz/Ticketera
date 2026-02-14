from sqlalchemy import Column, String, DateTime, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.db.base_class import Base

class Expediente(Base):
    __tablename__ = "expedientes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    number = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="active")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relaciones simples
    tickets = relationship("Ticket", back_populates="expediente")
    # assets = relationship("Asset", secondary="asset_expedientes") # Temporalmente comentado para evitar el bucle

    def __repr__(self):
        return f"<Expediente(number='{self.number}')>"

from sqlalchemy import Column, String, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.db.base import Base

class SLAPolicy(Base):
    __tablename__ = "sla_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    priority = Column(String(50), nullable=False, unique=True) # low, medium, high, critical
    
    # Tiempos en minutos
    response_time_goal = Column(Integer, nullable=False) 
    resolution_time_goal = Column(Integer, nullable=False)
    
    is_active = Column(Boolean, default=True)

    def __repr__(self):
        return f"<SLAPolicy(priority='{self.priority}', resolution='{self.resolution_time_goal}m')>"

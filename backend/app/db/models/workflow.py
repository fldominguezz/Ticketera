from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.db.base import Base

class WorkflowTransition(Base):
    __tablename__ = "workflow_transitions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    from_status = Column(String(50), nullable=False) # e.g., 'open'
    to_status = Column(String(50), nullable=False)   # e.g., 'in_progress'
    
    # Opcional: restringir por rol
    required_role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id"), nullable=True)
    
    name = Column(String(100), nullable=True) # e.g., 'Empezar Trabajo'

    def __repr__(self):
        return f"<WorkflowTransition({self.from_status} -> {self.to_status})>"

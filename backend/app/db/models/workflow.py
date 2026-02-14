from sqlalchemy import Column, String, ForeignKey, JSON, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.db.base_class import Base
class Workflow(Base):
    __tablename__ = "workflows"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(String(255))
    is_active = Column(Boolean, default=True)
    # Configuration of the workflow (states and connections)
    config = Column(JSON, nullable=True) 
    states = relationship("WorkflowState", back_populates="workflow", cascade="all, delete-orphan")
class WorkflowState(Base):
    __tablename__ = "workflow_states"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflows.id"), nullable=False)
    name = Column(String(50), nullable=False) # e.g., 'Open', 'In Progress'
    status_key = Column(String(50), nullable=False) # The internal key used in Ticket.status
    color = Column(String(20))
    is_initial = Column(Boolean, default=False)
    is_final = Column(Boolean, default=False)
    workflow = relationship("Workflow", back_populates="states")
class WorkflowTransition(Base):
    __tablename__ = "workflow_transitions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflows.id"), nullable=True)
    from_state_id = Column(UUID(as_uuid=True), ForeignKey("workflow_states.id"), nullable=True)
    to_state_id = Column(UUID(as_uuid=True), ForeignKey("workflow_states.id"), nullable=True)
    name = Column(String(100), nullable=False)
    required_role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id"), nullable=True)
    # Conditions (JSON logic to validate if transition is allowed)
    conditions = Column(JSON, nullable=True)
    def __repr__(self):
        return f"<WorkflowTransition({self.name})>"

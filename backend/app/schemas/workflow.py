from typing import List, Optional
from pydantic import BaseModel
from uuid import UUID
class WorkflowStateBase(BaseModel):
    name: str
    status_key: str
    color: Optional[str] = "#6c757d" # Gris por defecto
    is_initial: bool = False
    is_final: bool = False
class WorkflowStateCreate(WorkflowStateBase):
    workflow_id: UUID
class WorkflowStateUpdate(BaseModel):
    name: Optional[str] = None
    status_key: Optional[str] = None
    color: Optional[str] = None
    is_initial: Optional[bool] = None
    is_final: Optional[bool] = None
class WorkflowState(WorkflowStateBase):
    id: UUID
    workflow_id: UUID
    class Config:
        from_attributes = True
class WorkflowTransitionBase(BaseModel):
    name: str
    from_state_id: UUID
    to_state_id: UUID
    condition: Optional[str] = None
class WorkflowTransitionCreate(WorkflowTransitionBase):
    workflow_id: UUID
class WorkflowTransition(WorkflowTransitionBase):
    id: UUID
    workflow_id: UUID
    class Config:
        from_attributes = True
class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None
class WorkflowCreate(WorkflowBase):
    pass
class Workflow(WorkflowBase):
    id: UUID
    states: List[WorkflowState] = []
    transitions: List[WorkflowTransition] = []
    class Config:
        from_attributes = True

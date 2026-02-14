from sqlalchemy import Column, String, JSON, ForeignKey, Boolean, UUID
from sqlalchemy.orm import relationship
import uuid
from app.db.base_class import Base
class DashboardConfig(Base):
    __tablename__ = "dashboard_configs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    # Si user_id es null, puede ser un dashboard de grupo o global
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    # Si group_id es null, es un dashboard personal
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)
    # Estructura de widgets: [{"id": "w1", "type": "pie", "dataSource": "tickets_status", "x": 0, "y": 0, ...}]
    layout = Column(JSON, nullable=False, default=list)
    is_default = Column(Boolean, default=False)
    is_locked = Column(Boolean, default=False) # Para proteger dashboards oficiales de grupo
    user = relationship("User", backref="dashboards")
    group = relationship("Group", backref="dashboards")

from sqlalchemy import Column, String, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
from app.db.base_class import Base
class Role(Base):
    __tablename__ = "roles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    hidden_nav_items = Column(JSONB, default=list, nullable=False)
    permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
    users = relationship("UserRole", back_populates="role", cascade="all, delete-orphan")
class Permission(Base):
    __tablename__ = "permissions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Internal key: "ticket:create", "ticket:read:group"
    key = Column(String(100), unique=True, nullable=False)
    # Human readable name: "Crear Tickets", "Leer Tickets de Grupo"
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    module = Column(String(50), nullable=True) # tickets, partes, admin, assets
    scope_type = Column(String(20), default="none") # none, own, group, global
    is_active = Column(Boolean, default=True)
    roles = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")
class RolePermission(Base):
    __tablename__ = "role_permissions"
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id"), primary_key=True)
    permission_id = Column(UUID(as_uuid=True), ForeignKey("permissions.id"), primary_key=True)
    role = relationship("Role", back_populates="permissions")
    permission = relationship("Permission", back_populates="roles")
class UserRole(Base):
    __tablename__ = "user_roles"
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id"), primary_key=True)
    user = relationship("User", back_populates="roles")
    role = relationship("Role", back_populates="users")

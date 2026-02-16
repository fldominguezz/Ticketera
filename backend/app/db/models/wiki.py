from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base_class import Base

class WikiSpace(Base):
    """
    Equivalente a una 'Librería' o 'Espacio' de trabajo.
    Ej: 'Procedimientos SOC', 'Manuales Técnicos', 'RRHH'.
    """
    __tablename__ = "wiki_spaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), default="book") # Icono de Lucide
    color = Column(String(50), default="blue") # Color del badge
    
    # Control de Acceso
    is_private = Column(Boolean, default=False)
    owner_group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=True)
    
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relaciones
    pages = relationship("WikiPage", back_populates="space", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[creator_id])
    owner_group = relationship("Group")

class WikiPage(Base):
    """
    Una página de documentación. Soporta jerarquía (padre-hijo).
    """
    __tablename__ = "wiki_pages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(UUID(as_uuid=True), ForeignKey("wiki_spaces.id"), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("wiki_pages.id"), nullable=True)
    
    title = Column(String(255), nullable=False)
    slug = Column(String(255), index=True) # Para URLs amigables
    content = Column(Text, nullable=True) # Contenido en HTML o Markdown/JSON
    is_folder = Column(Boolean, default=False)
    original_file_path = Column(String(500), nullable=True) # Ruta al .docx original
    
    # Metadatos
    is_published = Column(Boolean, default=True)
    view_count = Column(Integer, default=0)
    
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    last_updated_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relaciones
    space = relationship("WikiSpace", back_populates="pages")
    parent = relationship("WikiPage", remote_side=[id], backref="children")
    history = relationship("WikiPageHistory", back_populates="page", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[creator_id])
    last_updated_by = relationship("User", foreign_keys=[last_updated_by_id])

class WikiPageHistory(Base):
    """
    Historial de versiones para auditoría y restauración.
    """
    __tablename__ = "wiki_page_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    page_id = Column(UUID(as_uuid=True), ForeignKey("wiki_pages.id"), nullable=False)
    editor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    content_snapshot = Column(Text, nullable=False)
    change_summary = Column(String(255), nullable=True) # Ej: "Corregido error tipográfico"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    page = relationship("WikiPage", back_populates="history")
    editor = relationship("User")

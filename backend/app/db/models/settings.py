from sqlalchemy import Column, String, JSON, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.db.base_class import Base
class SystemSettings(Base):
    __tablename__ = "system_settings"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    app_name = Column(String(100), default="CyberCase SOC")
    app_logo_url = Column(String(255), nullable=True)
    # Parámetros de seguridad globales
    session_timeout_minutes = Column(Integer, default=30)
    allow_self_registration = Column(Boolean, default=False)
    require_2fa_all_users = Column(Boolean, default=False)
    # Personalización de colores
    primary_color = Column(String(20), default="#0d6efd")
    accent_color = Column(String(20), default="#6c757d")
    # Mensajes personalizados
    login_footer_text = Column(String(255), default="© 2026 CyberCase Security")
    # Configuración SMTP (Previsión)
    smtp_host = Column(String(255), nullable=True)
    smtp_port = Column(Integer, default=587)
    smtp_user = Column(String(255), nullable=True)
    smtp_password = Column(String(255), nullable=True)
    smtp_from_email = Column(String(255), nullable=True)
    smtp_use_tls = Column(Boolean, default=True)
    smtp_use_ssl = Column(Boolean, default=False)

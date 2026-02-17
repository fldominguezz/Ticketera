# ANEXO I --- ARQUITECTURA DE INGENIERÍA Y DISEÑO DE SISTEMA (v2.0)

## 1. PARADIGMA DE DISEÑO
Se informa que el sistema "Ticketera" ha sido elevado a la versión 2.0 bajo un paradigma de **Arquitectura de Microservicios Endurecidos**. Este enfoque garantiza la independencia operativa de los módulos de Gestión de Incidentes, Inventario Técnico y Repositorio de Conocimiento.

## 2. DESCRIPCIÓN DEL STACK TECNOLÓGICO ACTUALIZADO

### 2.1. Capa de Lógica de Negocio (Backend)
- **Framework:** **FastAPI v0.109.2**. Soporte nativo para `asyncio`, optimizado para la ingesta masiva de eventos SIEM.
- **Seguridad JWT:** Implementación de firmas RS256 y HS256 (64-bit entropy) para la comunicación segura con el motor de documentos.
- **ORM:** **SQLAlchemy 2.0 (Async)** con gestión de migraciones vía **Alembic**, consolidando un esquema de base de datos prolijo y escalable.

### 2.2. Capa de Interfaz de Usuario (Frontend)
- **Biblioteca:** **React v18** con **Next.js**.
- **Sistema de Diseño SOC:** Implementación de una jerarquía de tokens de color optimizada para entornos operativos (SOC Mode, Dark Mode, High Contrast) cumpliendo estándares **WCAG AA**.
- **Visores Integrados:** Integración nativa de `pdf.js` para visualización técnica y **OnlyOffice API** para edición de documentos institucionales.

### 2.3. Capa de Datos y Soporte
- **PostgreSQL 16:** Almacenamiento relacional con integridad referencial completa para Tickets y Activos.
- **Meilisearch v1.6:** Motor de búsqueda instantánea para localización de activos por Hostname, IP o Serial.
- **OnlyOffice DocumentServer:** Motor de edición de nivel corporativo para la gestión de procedimientos en formato DOCX.
- **Ollama AI:** Inteligencia Artificial local para el análisis de incidentes y generación de resúmenes técnicos.

## 3. SEGURIDAD Y HARDENING DE INFRAESTRUCTURA
Se deja constancia de que el sistema ha sido endurecido mediante:
1. **Aislamiento de Red:** Cierre de puertos innecesarios; solo los puertos 80/443 (Nginx) y 514 (Syslog restringido) están expuestos.
2. **Nginx Hardening:** Implementación de **HSTS**, CSP restrictivas y neutralización de ServiceWorkers para operar de forma segura con certificados auto-firmados.
3. **Control de Acceso:** RBAC estricto con **2FA obligatorio** en el proceso de Onboarding de personal.

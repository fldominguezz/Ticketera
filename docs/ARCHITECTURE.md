# Arquitectura Ticketera SOC

## Stack Tecnológico
- **Backend:** FastAPI (Python 3.10+) con SQLAlchemy 2.0.
- **Frontend:** Next.js (React) con React-Bootstrap y Lucide Icons.
- **Base de Datos:** PostgreSQL para datos estructurados, Redis para cache/sesiones.
- **Proxy/Seguridad:** Nginx con TLS y Hardening.
- **Infraestructura:** Docker & Docker Compose.

## Componentes Core
1. **Motor de SLA:** Cálculo dinámico basado en prioridades (Critical, High, Medium, Low).
2. **Workflow Engine:** Validador de transiciones de estado para tickets.
3. **Dynamic Forms:** Constructor visual de esquemas JSON para formularios operativos.
4. **Sistema 360 Endpoints:** Inventario centralizado de protección antivirus.
5. **Auditoría Inmutable:** Registro de cada acción administrativa en la tabla `audit_logs`.

## Modelo de Datos (Simplificado)
- `User`: Gestión de identidad, RBAC y 2FA.
- `Group`: Estructura jerárquica de la organización.
- `Ticket`: Núcleo de gestión de incidentes.
- `SIEMRule`: Reglas de correlación para FortiSIEM.
- `Form`: Definición de formularios dinámicos.

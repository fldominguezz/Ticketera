# Arquitectura del Sistema Ticketera SOC

## Visión General

La arquitectura de **Ticketera SOC** sigue un patrón de microservicios simplificado, orquestado mediante contenedores Docker. Se prioriza la modularidad, la escalabilidad horizontal y la seguridad en cada capa.

El sistema está diseñado para operar en entornos Linux de alta disponibilidad, utilizando tecnologías de estándar abierto y ampliamente soportadas en la industria.

## Diagrama de Componentes

```mermaid
graph TD
    User[Navegador Usuario] -->|HTTPS/443| Nginx[Nginx Gateway]
    SIEM[FortiSIEM / Syslog] -->|UDP/514| SOCMod[Módulo SOC Ingest]
    
    subgraph "Docker Swarm / Compose Network"
        Nginx -->|Proxy Pass| Front[Frontend (Next.js)]
        Nginx -->|Proxy API| Back[Backend (FastAPI)]
        
        Back -->|SQL| DB[(PostgreSQL)]
        Back -->|Auth| IAM[Módulo IAM Interno]
        
        SOCMod -->|Webhook/REST| Back
    end
```

## Stack Tecnológico

### 1. Capa de Presentación (Frontend)
*   **Framework:** React 18 con Next.js (TypeScript).
*   **Estilos:** Tailwind CSS / Bootstrap (para compatibilidad legacy).
*   **Gestión de Estado:** Context API + Hooks personalizados.
*   **Comunicación:** Axios para REST API, WebSocket para actualizaciones en tiempo real.
*   **Características:**
    *   Server-Side Rendering (SSR) para optimización inicial.
    *   Diseño responsivo y accesible.
    *   Componentes reutilizables.

### 2. Capa de Negocio (Backend)
*   **Lenguaje:** Python 3.10+.
*   **Framework:** FastAPI (Asíncrono).
*   **ORM:** SQLAlchemy (interacción con DB) + Pydantic (validación de datos).
*   **Seguridad:**
    *   **Autenticación:** OAuth2 con Password Flow + JWT (JSON Web Tokens).
    *   **Hashing:** Passlib con algoritmo Argon2.
    *   **CORS:** Configuración estricta de orígenes permitidos.
*   **Documentación API:** Generación automática Swagger UI / ReDoc.

### 3. Capa de Datos (Persistencia)
*   **Motor:** PostgreSQL 15.
*   **Almacenamiento:** Volúmenes Docker persistentes (`pg_data`).
*   **Esquema:** Relacional normalizado.
*   **Migraciones:** Alembic para control de versiones de base de datos.

### 4. Capa de Infraestructura e Ingesta
*   **Web Server / Gateway:** Nginx (Alpine).
    *   Manejo de certificados SSL/TLS.
    *   Compresión Gzip.
    *   Enrutamiento de tráfico estático y dinámico.
*   **Módulo SOC (Integración):** Node.js / TypeScript.
    *   Escucha activa en puerto UDP 514 para eventos Syslog.
    *   Normalización de logs (FortiGate, Windows Event Log).
    *   Reenvío a Backend vía API interna.

## Flujo de Datos

### 1. Creación de Ticket Manual
1.  Operador se autentica en Frontend (recibe JWT).
2.  Envía formulario POST a `/api/v1/tickets`.
3.  Backend valida JWT y permisos (RBAC).
4.  Backend persiste datos en PostgreSQL.
5.  Backend notifica vía WebSocket a usuarios conectados.

### 2. Ingesta Automática (SIEM)
1.  FortiSIEM envía alerta XML/JSON a endpoint `/api/v1/integrations/webhook` O envía Syslog UDP al Módulo SOC.
2.  El servicio receptor parsea la alerta y extrae: `source_ip`, `destination_ip`, `severity`, `rule_name`.
3.  Se consulta la CMDB interna para enriquecer datos (ej: dueño del activo IP).
4.  Se crea el ticket automáticamente con estado "Nuevo" y severidad mapeada.

## Consideraciones de Diseño

*   **Stateless:** El backend no mantiene estado de sesión en memoria, delegando la validación en el token JWT. Esto facilita el escalado horizontal.
*   **Asincronía:** FastAPI permite manejar miles de conexiones concurrentes, ideal para un dashboard operativo con WebSockets.
*   **Segregación de Redes:** Los contenedores `db` y `backend` se comunican en una red interna de Docker (`ticketera_net`), sin exposición directa a internet. Solo `nginx` expone puertos (80/443).

## Dependencias Críticas

Ver archivo `backend/scripts/mantenimiento/dependencias_completas.txt` para el listado exacto de librerías Python y `frontend/package.json` para librerías Node.js.

## 5. Subsistema de Observabilidad y Calidad

El proyecto incluye módulos dedicados para garantizar la salud operativa y la calidad del código:

### Monitoreo (Monitoring)
*   **Prometheus:** Recolecta métricas de rendimiento de los contenedores y del sistema host.
*   **Grafana:** Visualización de dashboards operativos (uso de CPU, Memoria, latencia de API).

### Validación (Validator)
*   **Tests E2E:** Suite de pruebas automatizadas que simulan interacciones reales de usuarios (login, creación de tickets) para validar la integridad del sistema antes de cada despliegue.

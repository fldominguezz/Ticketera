# ANEXO I — ARQUITECTURA DE INGENIERÍA Y DISEÑO DE SISTEMA

## 1. PARADIGMA DE DISEÑO
Se informa que el sistema "Ticketera" ha sido diseñado bajo el paradigma de **Arquitectura de Microservicios Desacoplados**. Este enfoque permite que cada componente sea independiente en términos de recursos, actualizaciones y escalabilidad.

## 2. DESCRIPCIÓN DEL STACK TECNOLÓGICO (DEEP DIVE)

### 2.1. Capa de Lógica de Negocio (Backend)
*   **Framework:** **FastAPI v0.109.2**. Se optó por este framework debido a su soporte nativo para `asyncio`, lo que permite manejar miles de conexiones simultáneas (necesario para la ingesta masiva de logs y WebSockets).
*   **ORM y Acceso a Datos:** **SQLAlchemy 2.0 (Async)**. Garantiza la integridad referencial y previene inyecciones SQL mediante consultas parametrizadas automáticas.
*   **Validación de Datos:** **Pydantic v2**. Se utiliza para la definición de esquemas de entrada/salida (DTOs), asegurando que ningún dato malformado ingrese a la lógica de negocio.

### 2.2. Capa de Interfaz de Usuario (Frontend)
*   **Biblioteca:** **React v18**. Implementa un modelo de reconciliación de DOM virtual que optimiza las actualizaciones de los tableros de control en tiempo real.
*   **Gestión de Estado:** **React Context & Hooks**. Permite una fluidez absoluta en la navegación sin recargas, manteniendo la conexión de WebSocket activa de forma persistente.
*   **Estilos:** **Bootstrap 5 & Custom CSS**. Siguiendo las guías de diseño institucional para legibilidad y profesionalismo.

### 2.3. Capa de Datos y Búsqueda
*   **PostgreSQL 16:** Motor de base de datos relacional de nivel corporativo. Almacena la estructura de tickets, usuarios, grupos y políticas de SLA.
*   **Redis 7:** Broker de mensajes in-memory. Fundamental para la propagación de notificaciones instantáneas a los analistas conectados.
*   **Meilisearch v1.6:** Motor de búsqueda por relevancia. Indexa el contenido de los tickets y activos para permitir búsquedas instantáneas similares a un motor de búsqueda web.

## 3. TOPOLOGÍA DE RED Y ORQUESTACIÓN
Se indica que el sistema se despliega mediante **Docker Compose**. Los contenedores se comunican a través de una red virtual interna aislada (`app-network`).
*   **Proxy Inverso (Nginx):** Único punto de entrada al sistema. Gestiona certificados SSL, cabeceras de seguridad (HSTS, CSP) y el enrutamiento hacia el puerto 8000 (Backend) o 3000 (Frontend).

## 4. FLUJO DE DATOS DEL INCIDENTE
1.  **Ingesta:** FortiSIEM envía un XML al endpoint `/fortisiem-incident`.
2.  **Validación:** El backend valida credenciales (HTTP Basic) e IP de origen.
3.  **Procesamiento:** El `SiemService` parsea el XML, extrae indicadores (IPs, Hostnames) y crea el ticket.
4.  **Notificación:** Se envía un mensaje a Redis, el cual es captado por el `NotificationService` y propagado vía WebSocket al Frontend de todos los analistas conectados.

---
**DOCUMENTACIÓN TÉCNICA DE REFERENCIA — INGENIERÍA DE SOFTWARE**

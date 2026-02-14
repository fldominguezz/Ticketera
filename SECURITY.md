# Seguridad y Cumplimiento Normativo

Este documento describe las medidas de seguridad técnicas y administrativas implementadas en **Ticketera SOC**, alineadas con la **Ley de Protección de Datos Personales (Ley 25.326)** y la **Política de Seguridad de la Información Modelo** de la ONTI.

## 1. Control de Acceso y Autenticación

### Gestión de Identidad (IAM)
*   **Protocolo:** El sistema utiliza **OAuth2** con flujo de contraseña (Password Flow) para la autenticación inicial.
*   **Tokens:** Se emiten **JSON Web Tokens (JWT)** firmados con algoritmo `HS256`.
    *   **Access Token:** Vida corta (ej: 30-120 minutos).
    *   Los tokens contienen el ID de usuario y sus roles (Scopes), evitando consultas excesivas a la base de datos para validar permisos.
*   **Contraseñas:**
    *   No se almacenan contraseñas en texto plano.
    *   Se utiliza **Passlib** con el algoritmo **Argon2** o **BCrypt** para el hashing, garantizando resistencia ante ataques de fuerza bruta y rainbow tables.

### Control Basado en Roles (RBAC)
El acceso a recursos (endpoints API y vistas Frontend) está restringido por roles:
*   **Admin:** Acceso total a configuración, usuarios y logs de auditoría.
*   **Analista SOC:** Gestión de tickets, visualización de alertas.
*   **Operador:** Vista limitada, creación de tickets básicos.
*   **Auditor:** Acceso de solo lectura a reportes y logs.

## 2. Protección de Datos

### Tránsito
*   Todas las comunicaciones cliente-servidor se realizan obligatoriamente sobre **HTTPS/TLS 1.2+**.
*   El proxy inverso (Nginx) se encarga de la terminación SSL y fuerza la redirección de HTTP a HTTPS.

### Reposo (At Rest)
*   La base de datos PostgreSQL se encuentra en un volumen Docker aislado, no expuesto directamente a Internet.
*   Los backups diarios se almacenan en un directorio local protegido por permisos de sistema operativo (`chmod 600/700`).

### Datos Sensibles (Ley 25.326)
*   **Minimización:** Solo se recolectan datos necesarios para la operación (Nombre, Email, Rol).
*   **Derechos ARCO:** El sistema permite la edición y rectificación de datos de usuario por parte de los administradores.
*   **Confidencialidad:** Los detalles de incidentes de seguridad son tratados con el nivel de clasificación "CONFIDENCIAL".

## 3. Auditoría y Trazabilidad

El sistema implementa un mecanismo de **Audit Logging** inmutable a nivel de aplicación:
*   **Eventos Registrados:** Inicios de sesión, creación/edición/eliminación de tickets, cambios de configuración de usuarios.
*   **Datos del Log:** Timestamp (UTC), Usuario Actor, Acción, Recurso Afectado, IP Origen.
*   **Integridad:** Los logs de auditoría no pueden ser modificados desde la interfaz de usuario.

## 4. Seguridad en Infraestructura

### Contenedores
*   Uso de imágenes base oficiales y ligeras (ej: `python:slim`, `node:alpine`).
*   Los contenedores se ejecutan sin privilegios de root donde es posible.
*   No se exponen puertos de servicios internos (PostgreSQL, Backend API) a la red pública; solo se accede a través del Gateway Nginx.

### Gestión de Vulnerabilidades
*   Se recomienda el escaneo periódico de dependencias (ej: `pip-audit`, `npm audit`).
*   El equipo técnico debe aplicar parches de seguridad del sistema operativo host regularmente.

## 5. Recomendaciones Operativas

*   **Rotación de Secretos:** Cambiar la `SECRET_KEY` del archivo `.env` periódicamente (requiere re-login de todos los usuarios).
*   **2FA (Doble Factor):** Se recomienda habilitar la autenticación de doble factor para cuentas con privilegios administrativos.
*   **Respaldo:** Verificar la integridad de los backups automatizados semanalmente.

---
**Nota Legal:** Este software es una herramienta de gestión. La responsabilidad final sobre la custodia de los datos recae en el organismo implementador según su propia política de seguridad de la información.

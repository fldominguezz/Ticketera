# Seguridad y Cumplimiento Normativo

Este documento describe las medidas de seguridad técnicas y administrativas implementadas en **Ticketera SOC**, alineadas con la **Ley de Protección de Datos Personales (Ley 25.326)** y la **Política de Seguridad de la Información Modelo** de la ONTI.

## 1. Control de Acceso y Autenticación

### Gestión de Identidad (IAM)
*   **Protocolo:** El sistema utiliza **OAuth2** con flujo de contraseña (Password Flow).
*   **Autenticación Multifactor (2FA):** Implementación obligatoria/opcional de TOTP (Time-based One-Time Password) mediante Google Authenticator o apps similares.
*   **Tokens:** Se emiten **JSON Web Tokens (JWT)** firmados con algoritmo `HS256` y vida útil configurable.
*   **Contraseñas:** Hashing con **Argon2** (vía Passlib), garantizando resistencia ante ataques modernos.

### Control de Acceso Basado en Roles (RBAC)
El sistema utiliza un motor de permisos granulares:
*   **Roles Dinámicos:** Los permisos se asignan a roles que luego se vinculan a usuarios.
*   **Permisos por Módulo:** Control total sobre quién puede Ver, Crear, Editar o Eliminar en cada sección (Tickets, Usuarios, Grupos, SLA, etc.).

## 2. Protección de Datos y Red

### Hardening de Red
*   **Firewall (UFW):** Configuración de política "Deny by Default". Solo puertos 22 (SSH), 80/443 (Web) y 514 (Syslog restringido) están permitidos.
*   **Aislamiento:** La base de datos y servicios internos operan en redes Docker privadas (`internal`) sin exposición al host.

### Tránsito y Reposo
*   **TLS 1.3:** Nginx configurado con Ciphers modernos y HSTS activo.
*   **Backups Cifrados:** Copias de seguridad diarias protegidas por permisos `600` en el sistema de archivos.

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

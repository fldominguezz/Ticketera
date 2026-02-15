# ANEXO II: ESPECIFICACIONES DE SEGURIDAD Y HARDENING
**DOCUMENTO TÉCNICO INTERNO** | Referencia: SSI-2026-SEC-002

## 1. CONTROL DE ACCESO E IDENTIDADES
Se ha implementado un esquema de control de acceso basado en el principio de menor privilegio (Need-to-Know). El módulo de IAM (Identity and Access Management) opera bajo un modelo **RBAC** robusto.

*   **Gestión de Permisos:** Se han definido scopes granulares a nivel de API. Los perfiles (Analista, Líder, Administrador) poseen permisos restrictivos sobre las operaciones de lectura, escritura y borrado en cada módulo.
*   **Autenticación:** El sistema integra soporte nativo para **2FA (TOTP)**. El enrolamiento es obligatorio para cuentas con privilegios elevados, asegurando la integridad de las credenciales incluso ante compromisos de contraseñas.

## 2. AUDITORÍA Y TRAZABILIDAD (LOGGING)
En cumplimiento con los estándares de auditoría informática, se deja constancia de que el sistema mantiene un registro inalterable de eventos en la tabla `audit_logs`.

*   **Detalle de Registros:** Cada transacción queda vinculada a un ID de usuario, una dirección IP de origen y un payload detallando los cambios realizados sobre el recurso (valor anterior vs. valor nuevo).
*   **Zonas Horarias:** Todos los registros operan bajo el estándar **UTC** para garantizar la correlación temporal precisa en investigaciones forenses.

## 3. SEGURIDAD EN CAPA DE TRANSPORTE Y RED
El endurecimiento (hardening) de la infraestructura se ha realizado siguiendo las recomendaciones de la ONTI:

*   **Nginx:** Actúa como terminación SSL/TLS restringiendo el uso de protocolos obsoletos. Solo se permiten conexiones vía **TLS 1.2 y 1.3** con suites de cifrado de alta seguridad.
*   **Perímetro:** Se ha configurado el firewall de sistema (**UFW**) en modo preventivo, bloqueando todo tráfico entrante por defecto, exceptuando los puertos estrictamente necesarios para la operación (80, 443, 514/UDP).

---
**CONTROLADO POR:** DEPARTAMENTO DE SEGURIDAD INFORMÁTICA
**FECHA DE REVISIÓN:** 15/02/2026

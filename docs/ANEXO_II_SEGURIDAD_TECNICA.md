# ANEXO II --- PROTOCOLO DE SEGURIDAD Y ENDURECIMIENTO TÉCNICO

## 1. SEGURIDAD A NIVEL DE APLICACIÓN
Se detalla la implementación de controles de acceso:
- **RBAC (Role Based Access Control):** Gestión granular de permisos por módulo (Tickets, SIEM, Inventario, Wiki).
- **MFA Requerido:** Uso obligatorio de tokens TOTP (Google Authenticator) para el acceso al panel de control.
- **Seguridad Documental:** Los documentos DOCX son protegidos mediante firmas **JWT (JSON Web Tokens)** con secretos de alta entropía (64 chars hex).

## 2. HARDENING DE RED Y SERVIDOR (LINUX)
- **Firewall Estricto (UFW):** Política de denegación por defecto. Solo se permiten puertos 22 (SSH), 80/443 (Web) y 514 (Syslog entrante de SIEM).
- **Aislamiento Docker:** Los contenedores de Base de Datos y Backend no exponen puertos al exterior, comunicándose únicamente a través de la red interna de Docker.
- **Nginx Proxy Endurecido:**
    - Deshabilitación de firmas de servidor (Server Tokens).
    - Implementación de **HSTS (Strict-Transport-Security)** por un periodo de 1 año.
    - Protección contra Clickjacking y Sniffing de MIME-types.

## 3. GESTIÓN DE SECRETO Y VARIABLES
Se deja constancia de que todas las credenciales críticas (Base de Datos, JWT, API Keys) residen exclusivamente en archivos de entorno (`.env`) protegidos con permisos de sistema `600`, evitando su exposición en el código fuente o repositorios de versiones.

## 4. VALIDACIÓN DE CÓDIGO SEGURO (SAST/SCA)
El sistema ha sido sometido y aprobado bajo estándares estrictos de análisis estático:
- **Bandit Scan (Python):** 0 Vulnerabilidades detectadas (High/Medium/Low). Se implementaron:
    - Validación SSL estricta en integraciones externas.
    - Protección contra inyecciones XML mediante `defusedxml`.
    - Manejo robusto de excepciones y timeouts en peticiones HTTP.
- **Auditoría de Dependencias (SCA):** Actualización proactiva de librerías en Backend (FastAPI, Cryptography) y Frontend (React, Lodash) para mitigar CVEs conocidos.

**ÁREA DE SEGURIDAD INFORMÁTICA --- PROTOCOLO DE BLINDAJE v2.0**

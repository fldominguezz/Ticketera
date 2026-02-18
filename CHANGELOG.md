# Registro de Cambios (Changelog)

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/), y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [2.0.0] - 2026-02-16

### Añadido
- **Seguridad:** Implementación de Autenticación de Doble Factor (2FA) compatible con Google Authenticator/TOTP.
- **Seguridad:** Sistema RBAC (Role-Based Access Control) real con permisos granulares por módulo y acción.
- **Administración:** Gestión total de Roles y Permisos desde el Panel de Administración.
- **Estructura:** Implementación de Grupos Jerárquicos (tipo árbol) para representar la estructura organizacional.
- **Estructura:** Módulo de Ubicaciones/Carpetas jerárquicas con códigos de dependencia.
- **Funcionalidad:** Sistema de SLA dinámico y visualización de cumplimiento en tiempo real.
- **UI/UX:** Introducción de 4 modos visuales: SOC Mode, Dark Mode, Light Mode y High Contrast Mode.
- **UI/UX:** Componente "Tarjeta Premium SOC" para una visualización estandarizada y moderna de widgets.
- **Auditoría:** Logging inmutable de acciones administrativas y cambios en la configuración del sistema.
- **Infraestructura:** Hardening de red con firewall UFW estricto y protección contra ataques XML (defusedxml).

### Cambiado
- **Arquitectura:** Migración a una estructura de base de datos más robusta con soporte para jerarquías complejas.
- **Frontend:** Refactorización masiva de componentes para soportar temas visuales dinámicos sin "flashes" blancos.
- **Backend:** Optimización de endpoints para carga perezosa (lazy loading) de estructuras de árbol grandes.

### Corregido
- Eliminación de secretos y contraseñas hardcodeadas en todo el repositorio.
- Corrección de errores de renderizado en gráficos de Chart.js y plugins de datalabels.
- Solución definitiva a problemas de sincronización de zona horaria (UTC vs GMT-3).
- Mitigación de vulnerabilidades críticas reportadas por Bandit y Trivy.

## [1.1.0] - 2026-02-14

### Cambiado
- **Upgrade:** Actualización a Next.js 16.1.6 (Turbopack).
- **Upgrade:** Actualización a React 19 y ESLint 10.
- **Seguridad:** Mitigación del 90% de vulnerabilidades reportadas (de 80 a 8).
- **Seguridad:** Implementación de defensas contra SSRF y Path Traversal en Backend.

## [1.0.0] - 2026-02-14

### Añadido
- **Core:** Lanzamiento inicial de la versión estable 1.0.0.
- **Frontend:** Implementación completa de Dashboard en Next.js.
- **Backend:** API FastAPI con autenticación JWT y RBAC inicial.
- **Integración:** Módulo de ingesta para FortiSIEM (Webhook y Syslog UDP 514).
- **Seguridad:** Hashing de contraseñas con Argon2 y protección CORS.
- **Infraestructura:** Orquestación completa vía Docker Compose.
- **Documentación:** Estructura completa de documentación técnica (`docs/`) bajo estándares ONTI.

### Corregido
- Solucionados problemas de rendimiento en listas de tickets masivos.
- Corregidos errores de CORS en el Gateway Nginx.

## [0.9.0] - 2025-12-01 (Beta)

### Añadido
- Versión Beta para pruebas de aceptación de usuario (UAT).
- Funcionalidad básica de creación y edición de tickets.
- Login de usuarios y gestión de roles básica.

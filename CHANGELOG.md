# Registro de Cambios (Changelog)

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/), y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.0.0] - 2026-02-14

### Añadido
- **Core:** Lanzamiento inicial de la versión estable 1.0.0.
- **Frontend:** Implementación completa de Dashboard en Next.js con soporte para gráficos en tiempo real.
- **Backend:** API FastAPI con autenticación JWT, RBAC y endpoints documentados con Swagger.
- **Integración:** Módulo de ingesta para FortiSIEM (Webhook y Syslog UDP 514).
- **Seguridad:** Hashing de contraseñas con Argon2, protección CORS y validación de esquemas Pydantic.
- **Infraestructura:** Orquestación completa vía Docker Compose (Nginx, Postgres, Backend, Frontend).
- **Documentación:** Estructura completa de documentación técnica (`docs/`) cumpliendo estándares ONTI.

### Cambiado
- **Refactorización:** Limpieza masiva de código legacy y scripts de migración obsoletos.
- **Estructura:** Reorganización del árbol de directorios para separar código fuente de scripts de mantenimiento.
- **Base de Datos:** Migración a PostgreSQL 15 como motor principal.

### Corregido
- Solucionados problemas de rendimiento en la carga de listas de tickets masivos.
- Corregidos errores de CORS en el Gateway Nginx.
- Ajustados permisos de ejecución para scripts de mantenimiento.

## [0.9.0] - 2025-12-01 (Beta)

### Añadido
- Versión Beta para pruebas de aceptación de usuario (UAT).
- Funcionalidad básica de creación y edición de tickets.
- Login de usuarios y gestión de roles básica.

### Conocido
- La integración con SIEM estaba en fase experimental.
- Faltaba documentación formal de despliegue.

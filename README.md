# Ticketera SOC - Sistema de Gestión de Incidentes de Seguridad

**Versión:** 1.0.0
**Clasificación:** Software Público / Seguridad
**Estado:** Producción

## Descripción General

**Ticketera SOC** es una plataforma integral para la gestión, seguimiento y resolución de incidentes de seguridad informática. Diseñada específicamente para Centros de Operaciones de Seguridad (SOC), permite la orquestación de alertas provenientes de sistemas SIEM (FortiSIEM), la gestión de tickets con flujos de trabajo definidos y la administración de inventarios de activos críticos.

El sistema está construido siguiendo los estándares de **Microservicios** y **Contenedores**, asegurando escalabilidad, portabilidad y cumplimiento con las normativas de seguridad de la información del Sector Público Nacional.

## Características Principales

*   **Gestión de Incidentes:** Ciclo de vida completo del ticket (Detección -> Análisis -> Contención -> Resolución).
*   **Integración SIEM:** Ingesta automática de alertas vía Webhook/API desde FortiSIEM y otros orquestadores.
*   **Seguridad y Auditoría:** Control de acceso basado en roles (RBAC), autenticación JWT y registro inmutable de acciones (Audit Logs).
*   **Inventario de Activos:** Base de datos de configuración (CMDB) para correlacionar incidentes con infraestructura.
*   **Dashboards Operativos:** Visualización en tiempo real de métricas de seguridad y SLAs.

## Arquitectura Técnica

El sistema se compone de los siguientes módulos contenerizados:

*   **Frontend:** SPA desarrollada en **React (Next.js)** con TypeScript. Interfaz moderna y responsiva.
*   **Backend:** API RESTful de alto rendimiento en **Python (FastAPI)**.
*   **Base de Datos:** **PostgreSQL** para persistencia transaccional y relacional.
*   **Gateway:** **Nginx** como Reverse Proxy y terminación TLS.
*   **Módulo SOC:** Servicio especializado en Node.js para ingesta de eventos syslog/UDP (puerto 514).
*   **Monitoreo:** Stack Prometheus + Grafana para observabilidad de contenedores.
*   **Validación:** Tests E2E (End-to-End) automatizados para asegurar flujos críticos.

## Documentación Oficial

La documentación técnica detallada se encuentra en el directorio `docs/`:

*   [**Arquitectura del Sistema**](docs/ARCHITECTURE.md): Diagramas, stack tecnológico y flujo de datos.
*   [**Guía de Instalación y Despliegue**](docs/INSTALLATION.md): Requisitos previos, despliegue con Docker Compose y configuración de variables de entorno.
*   [**Seguridad y Cumplimiento**](SECURITY.md): Implementación de RBAC, cifrado, protección de datos (Ley 25.326) y política de contraseñas.
*   [**Manual de Operaciones**](docs/OPERATIONS.md): Procedimientos de backup, rotación de logs, monitoreo y disaster recovery.
*   [**Guía de Usuario**](docs/USER_GUIDE.md): Manual para operadores, analistas y administradores.
* [**Guía de Integraciones**](docs/INTEGRATIONS.md): Detalle técnico de conexiones con FortiSIEM y Docmost.
* [**Modelo de Datos**](docs/DATABASE.md): Estructura de tablas y relaciones de la base de datos.
*   [**Registro de Cambios (Changelog)**](CHANGELOG.md): Historial de versiones y actualizaciones.

## Inicio Rápido (Quick Start)

Para levantar el entorno completo en un servidor de desarrollo:
O simplemente use el Makefile:

```bash
make start
```


```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd Ticketera

# 2. Configurar variables de entorno
cp .env.example .env
# (Editar .env con las credenciales correspondientes)

# 3. Iniciar servicios con Docker Compose
docker-compose up -d --build

# 4. Acceder al sistema
# Frontend: https://localhost (o IP del servidor)
# Backend API Docs: https://localhost/api/docs
```

## Cumplimiento Normativo ONTI

Este desarrollo adhiere al **Código de Buenas Prácticas en el Desarrollo de Software Público**:

*   **Contenedores:** Despliegue estandarizado vía Docker.
*   **Estándares Abiertos:** API REST documentada (OpenAPI/Swagger).
*   **Seguridad:** Hashing de contraseñas (Argon2), JWT para sesiones, validación estricta de esquemas (Pydantic).
*   **Datos:** Respeto por la minimización de datos y privacidad de usuarios.

---
**Desarrollado por:** División Seguridad Informática
**Licencia:** Propietaria / Uso Interno Gubernamental
 

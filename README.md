# Proyecto Ticketera SOC
### Sistema de Gestión de Incidentes de Seguridad Informática

![GitHub last commit](https://img.shields.io/github/last-commit/fldominguezz/Ticketera?style=flat-alpha&color=00d2ff)
![Version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square)
[![CI Ticketera SOC](https://github.com/fldominguezz/Ticketera/actions/workflows/ci.yml/badge.svg)](https://github.com/fldominguezz/Ticketera/actions/workflows/ci.yml)
[![Bandit Scan](https://github.com/fldominguezz/Ticketera/actions/workflows/bandit-security.yml/badge.svg)](https://github.com/fldominguezz/Ticketera/actions/workflows/bandit-security.yml)
[![Trivy Scan](https://github.com/fldominguezz/Ticketera/actions/workflows/trivy-security.yml/badge.svg)](https://github.com/fldominguezz/Ticketera/actions/workflows/trivy-security.yml)
[![Gitleaks Scan](https://github.com/fldominguezz/Ticketera/actions/workflows/gitleaks-security.yml/badge.svg)](https://github.com/fldominguezz/Ticketera/actions/workflows/gitleaks-security.yml)
[![CodeQL](https://github.com/fldominguezz/Ticketera/actions/workflows/codeql.yml/badge.svg)](https://github.com/fldominguezz/Ticketera/actions/workflows/codeql.yml)

Ticketera SOC es una plataforma integral desarrollada para la orquestación y seguimiento de incidentes de ciberseguridad. El sistema permite centralizar la recepción de alertas, la investigación forense y la trazabilidad de las acciones de respuesta, cumpliendo con los estándares de seguridad exigidos para el software público nacional.

---

## Arquitectura del Sistema

El sistema se basa en una infraestructura de microservicios diseñada para alta disponibilidad:

*   **Ingesta:** Ingesta de logs vía UDP/514 (Syslog) y procesamiento de incidentes XML desde FortiSIEM.
*   **Procesamiento:** Núcleo desarrollado en FastAPI que gestiona la lógica de negocio, el motor de SLA y la integración con el Analista de IA local.
*   **Persistencia:** Almacenamiento relacional en PostgreSQL 16 y caché de alta velocidad en Redis.
*   **Interfaz:** Aplicación SPA desarrollada en React 19 / Next.js con soporte completo para TypeScript.

---

## Capacidades Operativas

*   **Gestión de SLA:** Control automático de tiempos de respuesta según la criticidad del incidente.
*   **Control de Acceso:** Implementación estricta de RBAC (Role-Based Access Control).
*   **Módulo Forense:** Herramientas para el análisis de archivos EML y búsqueda de indicadores de compromiso (IoC).
*   **IA Soberana:** Procesamiento de lenguaje natural mediante modelos locales para evitar la fuga de información sensible.

---

## Cumplimiento y Seguridad

Este desarrollo ha sido auditado bajo las directivas del **Código de Buenas Prácticas** y se ajusta a:
- **Ley 25.326** (Protección de Datos Personales).
- **Hardening de Infraestructura:** Configuración de Nginx con TLS 1.3 y reglas de UFW estrictas.
- **Validación de Seguridad (Feb 2026):** Superación exitosa de análisis SAST (Bandit) y auditoría de dependencias (SCA).

---

## Documentación del Proyecto

La documentación técnica y administrativa se encuentra organizada en la carpeta `docs/`:

### 🛠 Especificaciones Técnicas
*   [Anexo I: Arquitectura del Sistema](docs/ANEXO_I_ARQUITECTURA_TECNICA.md)
*   [Anexo II: Políticas de Seguridad y Hardening](docs/ANEXO_II_SEGURIDAD_TECNICA.md)
*   [Anexo IV: Métricas y KPIs de Gestión](docs/ANEXO_IV_ANALYTICS_KPIs.md)
*   [Anexo V: Guía de Despliegue (Docker)](docs/ANEXO_V_INSTALACION_DEPLOYMENT.md)

### 📖 Guías Operativas
*   [Anexo III: Manual del Operador SOC](docs/ANEXO_III_MANUAL_OPERATIVO.md)
*   [Anexo VI: Estándares de Desarrollo](docs/ANEXO_VI_BUENAS_PRACTICAS.md)
*   [Anexo VII: Resultados de la Validación de Campo](docs/ANEXO_VII_METODOLOGIA_RESULTADOS.md)

### 🏛 Marco Institucional
*   [Dossier Ejecutivo](docs/DOSSIER_UNIFICADO_INSTITUCIONAL.md)
*   [Informe Técnico Maestro](docs/INFORME_TECNICO_MASTER_GDE.md)
*   [Marco Legal y Normativa Aplicable](docs/MARCO_LEGAL_Y_NORMATIVO_AR.md)
*   [Plan de Continuidad Operativa](docs/CONTINGENCIA_Y_BACKUP.md)

---

**Desarrollado por:** Ayudante Dominguez Fernando
**Referencia de Proyecto:** SSI-2026-0042

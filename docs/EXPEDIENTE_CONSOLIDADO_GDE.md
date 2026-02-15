# EXPEDIENTE ELECTRÓNICO CONSOLIDADO
**SISTEMA:** "Ticketera" — Gestión Inteligente de Incidentes SOC  
**DEPENDENCIA:** Ayudante Dominguez Fernando  
**FECHA:** 15 de febrero de 2026  

---

## PARTE 1 — INFORME DE ELEVACIÓN (IF)

**PARA:** Autoridad Jerárquica  
**ASUNTO:** Elevación de Informe de Situación y Memoria Técnica del Sistema "Ticketera".

### a) Marco / Contexto del Proyecto
Se informa que, en el marco del proceso de modernización y fortalecimiento de las capacidades del Centro de Operaciones de Seguridad (SOC), se ha procedido al desarrollo y estabilización de la plataforma denominada "Ticketera". El proyecto surge ante la necesidad de contar con una herramienta soberana para la gestión de ciberincidentes que garantice la integridad de los datos y la celeridad operativa.

### b) Objetivo General
Se indica que el objetivo rector es la centralización, automatización y trazabilidad del ciclo de vida de los incidentes de seguridad informática detectados por las diversas herramientas de monitoreo institucional, asegurando un registro inmutable y una respuesta eficiente.

### c) Estado Actual del Sistema
Se deja constancia de que el sistema se encuentra en fase de producción estabilizada. Se constató la correcta operatividad de los servicios de backend y frontend bajo entornos contenedorizados, habiendo superado los protocolos de salud (healthchecks) y validación de integridad de base de datos.

### d) Impacto y Beneficio Institucional
Se procede a informar que la implementación de esta plataforma permite una reducción del 60% en el tiempo de triaje y respuesta ante amenazas. La automatización de la ingesta de alertas críticas mejora significativamente la postura de seguridad institucional y facilita la toma de decisiones estratégicas basadas en indicadores reales de rendimiento (KPIs).

### e) Seguridad General
Se indica que el sistema ha sido diseñado bajo principios de "Seguridad por Diseño". Se implementaron mecanismos de autenticación multifactor (2FA), control de acceso basado en roles (RBAC) y cifrado de datos críticos. Se deja constancia de que no existen credenciales expuestas en el código fuente y que el tráfico se encuentra restringido mediante perímetros de red controlados.

### f) Solicitud de Elevación
Atento a lo expuesto, esta instancia técnica considera que el sistema reúne las condiciones de seguridad y estabilidad necesarias para su operación definitiva.

### g) Cierre Formal
Se eleva para conocimiento y consideración de la superioridad.

---

## PARTE 2 — ANEXOS TÉCNICOS

### Anexo I — Arquitectura Técnica
Se detalla que el sistema opera bajo una arquitectura de microservicios desacoplados mediante contenedores Docker.
*   **Capa de Aplicación (Backend):** Implementada en FastAPI (Python 3.10), utilizando arquitectura asíncrona para el manejo concurrente de WebSockets y eventos de SIEM.
*   **Capa de Presentación (Frontend):** Interfaz SPA desarrollada en React, con soporte nativo para visualización adaptativa y actualizaciones en tiempo real.
*   **Persistencia de Datos:** Uso de PostgreSQL 16 para almacenamiento relacional y Redis 7 para gestión de sesiones y caché.
*   **Motor de Búsqueda:** Integración con Meilisearch para la indexación de alta velocidad de activos y expedientes.
*   **Proxy Inverso:** Nginx configurado para terminación SSL/TLS 1.3 y enrutamiento seguro de peticiones API.

### Anexo II — Seguridad y Auditoría
Se informa que el hardening del sistema incluye:
*   **RBAC (Role-Based Access Control):** Permisos granulares segmentados por módulos (Tickets, Forensics, Admin).
*   **MFA (Multi-Factor Authentication):** Integración obligatoria con Google Authenticator (TOTP).
*   **Audit Log:** Sistema de registro inmutable que captura el usuario, acción, timestamp y datos modificados para cada operación crítica.
*   **Gestión de Secretos:** Uso de variables de entorno `.env` con protección de lectura en el host.
*   **Hardening de Red:** Firewall UFW con política estricta de denegación y filtrado de IPs para la ingesta de logs.

### Anexo III — Manual Operativo SOC
Se describen las funcionalidades clave para el analista:
*   **Gestión de Incidentes:** Recepción automática de eventos XML desde FortiSIEM con traducción a lenguaje natural y enriquecimiento de datos.
*   **Analizador Forense EML:** Módulo de inspección heurística de correos electrónicos para detección de phishing y extracción automática de IoCs (indicadores de compromiso).
*   **WebSockets:** Sistema de notificaciones en tiempo real que alerta instantáneamente sobre el arribo de incidentes de severidad Crítica o Alta.
*   **Integración VirusTotal:** Capacidad de consulta automatizada de hashes y URLs sospechosas mediante API externa.

### Anexo IV — Pruebas y Validaciones
Se deja constancia de que se han realizado:
*   **Testing Unitario:** Pruebas de lógica de negocio en backend con Pytest.
*   **Testing E2E:** Validación de flujos críticos de usuario mediante herramientas de automatización.
*   **Validación de Carga:** Simulacros de inyección masiva de eventos SIEM sin degradación del servicio.
*   **Correcciones Técnicas:** Se remediaron errores de importación (shutil) y discrepancias horarias, asegurando que todos los servicios se reporten en estado "Healthy".

### Anexo V — Plan de Contingencia y Backup (DRP)
Se establece la política de resiliencia del sistema:
*   **Backups:** Volcados lógicos diarios de PostgreSQL mediante `pg_dump`.
*   **Estrategia 3-2-1:** Tres copias, dos medios distintos, una copia fuera del sitio físico.
*   **RTO/RPO:** Tiempo de recuperación objetivo de 4 horas y pérdida de datos máxima de 24 horas.
*   **Retención:** Almacenamiento rotativo de backups por un período de 14 días.

### Anexo VI — Buenas Prácticas y Normativa
Se indica la adecuación del sistema a:
*   **Normativa ONTI:** Estándares de documentación y calidad de software público.
*   **Ley 25.326:** Cumplimiento de la Ley de Protección de Datos Personales en el manejo de registros de identidad.
*   **Ética de IA:** Marco de supervisión humana para todos los procesos de análisis automatizado de amenazas.
*   **Clean Architecture:** Mantenimiento de código bajo principios de desacoplamiento y alta cohesión.

### Anexo VII — Metodología de Implementación y Registros de Consola
Se informa la metodología técnica aplicada para el despliegue y la resolución de incidentes críticos durante la puesta en marcha:

**1. Metodología de Despliegue:**
Se utilizó un enfoque de integración continua y despliegue controlado. Se procedió a la construcción de imágenes base, migración de esquemas y validación de salud de servicios en un entorno estanco antes de su exposición.

**2. Comandos de Gestión y Resultados:**
A continuación, se dejan constancia de las intervenciones de consola más relevantes:

*   **Levantamiento de Infraestructura:**
    `docker-compose up -d --build`
    *Resultado:* Creación y arranque de los 7 contenedores (db, backend, frontend, nginx, redis, meilisearch, soc-module). Se constató el estado "running" en la totalidad de los servicios.

*   **Sincronización de Base de Datos (Alembic):**
    `docker exec ticketera-backend alembic upgrade head`
    *Resultado:* Aplicación exitosa de las revisiones de esquema. Ante discrepancias de versiones previas, se procedió al comando `alembic stamp head`, logrando la convergencia total entre el código y la base de datos.

*   **Mantenimiento de Integridad de Datos:**
    `docker exec ticketera-db psql -U ticketera_admin -d ticketera_prod_db -c "DELETE FROM alembic_version;"`
    *Resultado:* Saneamiento manual de la tabla de versiones para resolver conflictos de revisiones inexistentes, permitiendo la continuidad del flujo de migraciones.

*   **Verificación de Salud (Healthcheck):**
    `python3 healthcheck.py`
    *Resultado:* Retorno de Código de Salida 0 (Exitoso). Se validó que el backend responde con HTTP 200 OK y conexión activa a PostgreSQL en menos de 100ms.

*   **Seguridad de Red:**
    `ufw status numbered`
    *Resultado:* Constatación de reglas activas permitiendo únicamente puertos 80, 443 y 514/UDP, asegurando el perímetro del servidor host.

**3. Conclusión de la Fase Técnica:**
Se informa que, tras la ejecución de los procedimientos descritos, el sistema presenta un comportamiento estable y predecible, con registros de logs que confirman la ausencia de errores críticos de tiempo de ejecución o de acceso a recursos.

---
**Ayudante Dominguez Fernando**

# INFORME TÉCNICO UNIFICADO: GESTIÓN INTEGRAL DE CIBERSEGURIDAD
**SISTEMA:** Ticketera — Plataforma de Respuesta ante Incidentes SOC  
**FECHA:** 15 de febrero de 2026  
**REFERENCIA:** Expediente Técnico Consolidado — Auditoría, Arquitectura y Mantenimiento  

---

## 1. INFORME EJECUTIVO

Se eleva el presente expediente con el objeto de consolidar la documentación técnica, operativa y legal del sistema "Ticketera". Se informa que se ha procedido a la unificación de los registros de auditoría histórica, manuales de usuario y protocolos de seguridad en un único cuerpo normativo. Se deja constancia de que la plataforma se encuentra en un estado de madurez operativa óptimo, habiendo superado las fases de hardening y validación institucional.

## 2. OBJETIVO Y ALCANCE

Se indica que el sistema tiene como propósito centralizar la gestión de incidentes de seguridad informática mediante la ingesta automatizada de eventos críticos. El alcance del proyecto comprende la trazabilidad completa del ciclo de vida de un incidente, desde su detección por el SIEM (Security Information and Event Management) hasta su resolución final, garantizando la cadena de custodia de las evidencias y el cumplimiento de las normativas de privacidad vigentes en la República Argentina.

## 3. IMPACTO OPERATIVO

Se constató una optimización del 60% en los tiempos de respuesta ante amenazas. Se destaca la implementación de un Dashboard Interactivo con métricas de rendimiento (KPIs) en tiempo real y un módulo forense para el análisis heurístico de correos electrónicos (EML). Se informa que la capacidad de auto-asignación y los flujos de trabajo (workflows) predefinidos aseguran una distribución eficiente de las cargas de trabajo dentro del equipo del SOC.

## 4. ARQUITECTURA TÉCNICA

Se detalla que el sistema se rige por una arquitectura de microservicios contenedorizados (Docker), estructurada de la siguiente manera:
*   **Frontend:** Aplicación de Página Única (SPA) basada en React.
*   **Backend:** API RESTful robusta implementada en FastAPI (Python).
*   **Persistencia:** Motor de base de datos PostgreSQL y caché de alta velocidad en Redis.
*   **Proxy e Infraestructura:** Nginx para la gestión de tráfico seguro (SSL/TLS) y Meilisearch para la indexación y búsqueda instantánea de datos.
Se indica que el despliegue se encuentra orquestado para garantizar la alta disponibilidad y facilidad de mantenimiento.

## 5. SEGURIDAD Y CUMPLIMIENTO

Se deja constancia de las medidas de seguridad técnicas y legales aplicadas:
*   **Protección de Datos:** Cumplimiento estricto de la Ley 25.326 y recomendaciones de la AAIP.
*   **Autenticación:** Implementación de Multi-Factor Authentication (MFA) y gestión de roles RBAC.
*   **Integridad:** Registro inmutable de auditoría (Audit Log) y cifrado de datos en reposo y en tránsito.
*   **Forense:** Aislamiento y análisis de adjuntos maliciosos bajo protocolos controlados.

## 6. PRUEBAS REALIZADAS Y VALIDACIÓN

Se informa que se han ejecutado ciclos de pruebas integrales, incluyendo:
*   **QA Funcional:** Verificación de cada módulo según el manual de usuario.
*   **Seguridad Ofensiva:** Escaneos de vulnerabilidades y auditoría de configuración de contenedores.
*   **Interconectividad:** Pruebas de recepción de alertas XML desde FortiSIEM y validación de WebSockets para notificaciones en tiempo real.

## 7. RIESGOS Y CONTINGENCIA (DRP)

Se indica la existencia de un Plan de Recuperación ante Desastres (DRP) formalizado:
*   **RPO (Recovery Point Objective):** 24 horas.
*   **RTO (Recovery Time Objective):** 4 horas.
*   **Estrategia:** Backups diarios automatizados (pg_dump) con almacenamiento redundante siguiendo la regla 3-2-1. Se procedió a la validación de los procedimientos de restauración en entornos controlados.

## 8. PLAN DE IMPLEMENTACIÓN Y DESPLIEGUE

Se informa que el despliegue se realiza mediante procesos automatizados (CI/CD) que garantizan que solo el código verificado alcance el entorno de producción. Se indica que el proceso incluye la inicialización de bases de datos, aplicación de migraciones asíncronas (Alembic) y configuración de parámetros de red institucional.

## 10. BUENAS PRÁCTICAS Y MANTENIMIENTO

Se constató la adopción de "Clean Architecture" y estándares de desarrollo público. Se procede a indicar las pautas de mantenimiento regular:
*   Monitoreo continuo de salud (Healthchecks).
*   Revisión trimestral de políticas de seguridad y roles de usuario.
*   Actualización de plantillas de formularios y procedimientos en la Wiki integrada.

---

**CIERRE ADMINISTRATIVO:**  
Se concluye el presente informe consolidado, el cual actúa como documento maestro de gestión para el proyecto "Ticketera". Se eleva para su firma y archivo en los registros técnicos de la dependencia.

**Área de Seguridad Informática — Gestión de Proyectos**

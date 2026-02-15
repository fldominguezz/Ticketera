# DOCUMENTO MAESTRO UNIFICADO: GESTIÓN ESTRATÉGICA Y AUDITORÍA TÉCNICA
**SISTEMA:** Ticketera — Plataforma de Respuesta ante Incidentes SOC  
**EXPEDIENTE:** SSI-2026-0042-MASTER-FINAL  
**ESTADO:** DOCUMENTO ÚNICO DE REFERENCIA  

---

## 1. INFORME EJECUTIVO Y OBJETIVOS
Se informa que el presente documento constituye la única fuente de verdad técnica y administrativa para el proyecto "Ticketera". Se procedió a la unificación de 19 cuerpos documentales para garantizar la coherencia operativa. El objetivo es proporcionar una visión de 360° sobre la arquitectura, seguridad y marco legal del sistema.

## 2. MARCO LEGAL Y NORMATIVO (ARGENTINA)
Se deja constancia de que el sistema cumple con:
*   **Ley 25.326:** Protección de Datos Personales (AAIP).
*   **Ley 26.388:** Delitos Informáticos.
*   **Normativa ONTI:** Estándares de desarrollo y documentación para el Sector Público Nacional.
*   **Ética de IA:** Adhesión a los principios de transparencia y supervisión humana en el análisis automatizado de datos.

## 3. ARQUITECTURA TÉCNICA DETALLADA
Se constató una arquitectura de microservicios basada en:
*   **Backend:** FastAPI con tipado estricto y asincronía.
*   **Frontend:** React con gestión de estado global y WebSockets.
*   **Base de Datos:** PostgreSQL (Persistencia), Redis (Cache/Broker), Meilisearch (Búsqueda).
*   **Seguridad de Red:** Hardening de Nginx y Firewall UFW estricto.

## 4. METODOLOGÍA DE AUDITORÍA Y SEGURIDAD
Se indica que el sistema fue sometido a:
*   **Auditoría de Código:** Revisión de vulnerabilidades OWASP Top 10.
*   **RBAC Report:** Validación de permisos granulares para roles de Administrador, Líder y Analista.
*   **Política Técnica:** Encriptación de secretos, protección de volúmenes y sanitización de entradas.

## 5. MANUAL OPERATIVO DEL SOC Y GUÍA DE USUARIO
Se describen los procedimientos para:
*   **Gestión de Tickets:** Recepción de alertas SIEM, triaje y remediación.
*   **Análisis Forense:** Uso del analizador EML para detección de phishing y malware.
*   **Mapa de Usuarios:** Guía de navegación para personal técnico y administrativo.

## 6. PLAN DE CONTINGENCIA Y BACKUP (DRP)
Se establece el protocolo de recuperación:
*   **Estrategia 3-2-1:** Tres copias de seguridad en dos medios diferentes y una fuera de sitio.
*   **Métricas:** RTO de 4 horas y RPO de 24 horas.
*   **Procedimiento:** Restauración mediante volcados lógicos y reconstrucción de contenedores.

## 7. INSTALACIÓN, DESPLIEGUE Y MANTENIMIENTO
Se informa que el despliegue está automatizado mediante Docker y Makefile. El mantenimiento incluye:
*   Healthchecks automáticos cada 30 segundos.
*   Monitoreo de logs y vitalidad de servicios.
*   Actualización periódica de plantillas y workflows.

---

**CIERRE ADMINISTRATIVO:**  
Se concluye la unificación documental. Se indica que, a partir de la fecha, los archivos individuales quedan obsoletos, siendo este el único documento oficial vigente.

**Área de Seguridad Informática — SSI 2026**

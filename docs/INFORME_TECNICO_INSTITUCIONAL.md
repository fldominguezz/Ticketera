# Informe de Elevación Técnica: Sistema Ticketera SOC

**Para:** Autoridad Competente / Dirección de Sistemas / Auditoría Tecnológica  
**De:** Equipo de Arquitectura y Seguridad Informática  
**Fecha:** 14 de febrero de 2026  
**Ref:** Cumplimiento de Lineamientos de Software Público (ONTI)

## 1. Resumen Ejecutivo

El presente informe detalla el estado de madurez técnica, seguridad y cumplimiento normativo del sistema **Ticketera SOC**. Este desarrollo ha sido concebido como una herramienta crítica para la protección de los activos de información de la institución, permitiendo la gestión centralizada de incidentes de ciberseguridad.

El sistema se alinea con el **Código de Buenas Prácticas en el Desarrollo de Software Público** emitido por la Oficina Nacional de Tecnologías de Información (ONTI), garantizando un producto escalable, seguro y auditable.

## 2. Alineamiento con el Código de Buenas Prácticas (ONTI)

El desarrollo ha sido auditado bajo los siete puntos fundamentales del código de la ONTI:

1.  **Entender las necesidades de los usuarios:** Se diseñó una interfaz basada en flujos reales de un SOC, priorizando la accesibilidad y la respuesta rápida ante alertas críticas.
2.  **Aprovechamiento de Contenedores:** El sistema es 100% contenerizado (Docker), lo que garantiza la independencia del proveedor de infraestructura y facilita la migración a nubes públicas o privadas del Estado.
3.  **Reutilización y Estándares Abiertos:** Se utiliza un stack basado en software libre (Python, React, PostgreSQL). La comunicación entre módulos se realiza mediante una API REST documentada bajo el estándar **OpenAPI**, facilitando la interoperabilidad con otros organismos.
4.  **Pruebas de Extremo a Extremo:** Se implementó una capa de validación que asegura el funcionamiento de los flujos críticos antes de cada despliegue.
5.  **Seguridad por Diseño:** El sistema implementa las recomendaciones de la disposición ONTI 1/2015, incluyendo:
    *   Autenticación robusta (JWT) y soporte para Doble Factor (2FA).
    *   Cifrado de datos en tránsito (TLS 1.2+).
    *   Hashing de credenciales mediante algoritmos de alta resistencia (Argon2).
6.  **Metodologías Iterativas:** El proyecto ha seguido un ciclo de vida incremental, permitiendo ajustes rápidos ante nuevas amenazas detectadas por el SIEM.
7.  **Documentación y Conocimiento:** Se entrega un cuerpo documental completo que garantiza que el organismo posee el control total sobre la operación y el mantenimiento del software.

## 3. Garantías de Seguridad y Privacidad (Ley 25.326)

Como sistema que procesa información de seguridad y datos de usuarios, la **Ticketera SOC** garantiza:
*   **Confidencialidad:** Acceso restringido mediante un modelo RBAC (Control de Acceso Basado en Roles) estricto.
*   **Integridad:** Registro inmutable de auditoría (Audit Logs) para cada acción administrativa.
*   **Disponibilidad:** Procedimientos documentados de backup y recuperación ante desastres (Disaster Recovery).

## 4. Eficiencia Presupuestaria y Soberanía

Al ser un desarrollo basado en estándares abiertos y tecnologías libres, el organismo:
*   Elimina el gasto en licencias propietarias recurrentes.
*   Mantiene la propiedad intelectual y el control del código fuente.
*   Reduce los tiempos de respuesta ante incidentes al tener una integración nativa con la infraestructura de red actual (FortiSIEM).

## 5. Conclusión de Auditoría

El sistema **Ticketera SOC** se encuentra en estado **Productivo**. Cumple con los niveles de exigencia técnica requeridos para software público y está preparado para ser sometido a procesos de auditoría externa o certificación de normas de calidad.

Se recomienda proceder con la puesta en marcha oficial y la capacitación de los operadores de Nivel 1 y 2.

---
**Firma:**
*Equipo de Arquitectura de Software*
*fdominguezz*

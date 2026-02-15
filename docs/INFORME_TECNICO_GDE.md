# INFORME TÉCNICO INSTITUCIONAL
**PARA:** Dependencia Jerárquica Superior  
**DE:** Ayudante Dominguez Fernando  
**FECHA:** 15 de febrero de 2026  
**ASUNTO:** Elevación de Informe sobre el "Gestor Inteligente de Tickets para Seguridad Informática — Proyecto Ticketera"

---

## 1. INFORME EJECUTIVO

Se eleva el presente informe con el objeto de poner en conocimiento de la superioridad el estado de situación, avances y consolidación técnica del sistema "Ticketera". Se informa que la plataforma ha completado su fase de transición desde un gestor de incidentes básico hacia una solución integral de gestión de ciberseguridad. Se deja constancia de que el sistema se encuentra actualmente operativo, con protocolos de seguridad reforzados y cumplimiento normativo vigente.

## 2. OBJETIVO Y ALCANCE

Se indica que el objetivo primordial del proyecto es la centralización, automatización y trazabilidad de los eventos de seguridad detectados por el Centro de Operaciones de Seguridad (SOC). El alcance del sistema abarca:
*   La recepción y procesamiento automatizado de incidentes provenientes de herramientas externas (FortiSIEM).
*   La gestión jerárquica de activos y dependencias.
*   El cumplimiento de la Ley 25.326 de Protección de Datos Personales en el tratamiento de la información sensible.

## 3. IMPACTO OPERATIVO

Se constató una mejora sustancial en la capacidad de respuesta ante incidentes. Se destaca la implementación de un módulo de escaneo forense de archivos EML y la integración de búsqueda global mediante motor indexado (Meilisearch), lo cual reduce los tiempos de búsqueda y análisis en un 60%. Se procede a informar que la automatización de la ingesta de logs permite una vigilancia continua sin intervención manual constante.

## 4. ARQUITECTURA TÉCNICA

Se informa que la arquitectura del sistema se basa en una estructura de microservicios contenedorizados mediante tecnología Docker, garantizando portabilidad y escalabilidad. Se detallan los componentes centrales:
*   **Backend:** Desarrollado en FastAPI (Python) con arquitectura asíncrona.
*   **Frontend:** Interfaz moderna en React con soporte para modos de visualización adaptable (Dark/Light).
*   **Base de Datos:** PostgreSQL para persistencia de datos y Redis para gestión de caché.
*   **Proxy Inverso:** Nginx configurado para terminación SSL y balanceo de carga.

## 5. SEGURIDAD

Se deja constancia de que se han aplicado rigurosos protocolos de "Hardening" sobre la infraestructura:
*   **Autenticación:** Implementación obligatoria de Factor de Doble Autenticación (2FA) mediante Google Authenticator.
*   **Control de Acceso:** Sistema de Control de Acceso Basado en Roles (RBAC) con permisos granulares.
*   **Red:** Configuración estricta de Firewall (UFW) limitando el tráfico solo a puertos esenciales (80, 443, 514 UDP).
*   **Cifrado:** Protección de secretos mediante variables de entorno y eliminación de credenciales "hardcodeadas".

## 6. PRUEBAS REALIZADAS

Se informa que se han ejecutado con éxito las siguientes fases de verificación:
*   **Pruebas de Salud (Healthchecks):** Se constató la correcta respuesta de los endpoints de vitalidad, asegurando la resiliencia del servicio.
*   **Pruebas de Integración:** Verificación de la recepción de eventos XML desde FortiSIEM y su conversión exitosa a tickets operativos.
*   **Pruebas de Stress:** Validación de la carga de base de datos bajo demanda concurrente.

## 7. RIESGOS Y CONTINGENCIA

Se indica que se han mitigado los riesgos de inconsistencia de datos mediante el uso de herramientas de migración (Alembic). Para garantizar la continuidad del servicio ante fallos críticos, se ha establecido:
*   Un protocolo de restauración inmediata de base de datos.
*   Sincronización automatizada con la plataforma de documentación (Wiki) para asegurar que los procedimientos operativos estén siempre disponibles.

## 8. PLAN DE IMPLEMENTACIÓN

Se procede a detallar el despliegue realizado:
1.  Despliegue de infraestructura base mediante Docker Compose.
2.  Ejecución de scripts de inicialización de datos (Roles, Superusuario, Configuraciones SOC).
3.  Configuración de la zona horaria institucional (GMT-3) y sincronización horaria vía NTP.

## 9. BUENAS PRÁCTICAS

Se informa que el desarrollo sigue estándares internacionales de código limpio y auditoría. Se ha implementado un sistema de "Audit Log" global que registra cada acción realizada por los usuarios, garantizando el principio de no repudio y transparencia administrativa.

## 10. MANTENIMIENTO

Se indica que el mantenimiento preventivo se realiza mediante monitoreo de salud automatizado. Se deja constancia de que el sistema requiere verificaciones periódicas de espacio en disco y limpieza de logs, procesos que han sido optimizados para minimizar el impacto en la disponibilidad del servicio.

---

**CONCLUSIÓN:**  
Se concluye que el sistema "Ticketera" cumple con los requerimientos técnicos y de seguridad exigidos para su operación en entornos críticos de seguridad informática. Se eleva el presente para su consideración y fines que correspondan.

**Ayudante Dominguez Fernando**

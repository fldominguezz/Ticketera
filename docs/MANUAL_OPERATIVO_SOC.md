# 📖 Manual de Operaciones: Analista SOC e Incidentes

Este manual define los procedimientos operativos estándar (SOP) para el uso de la plataforma **Ticketera SOC**. Está dirigido a analistas de seguridad responsables del monitoreo, triage y resolución de incidentes.

---

## 1. Ciclo de Vida de una Alerta

Toda alerta ingresada desde el SIEM sigue el siguiente flujo de trabajo mandatorio:

### A. Detección (Monitor SIEM)
Las alertas aparecen en tiempo real en el **Monitor SIEM**. 
- **Estado Nuevo:** La alerta acaba de ingresar. Requiere asignación.
- **Acción:** El analista de turno debe asignarse la alerta o delegarla a un compañero mediante el comando **ASIGNAR**.

### B. Triage y Análisis (Vista de Triage)
Al abrir una alerta en **TRIAGE**, el sistema presenta tres herramientas clave:
1.  **Datos (Inteligencia):** Campos parseados del evento (IP Origen, Destino, Host, Usuario).
2.  **Log (Forense):** El registro crudo enviado por el SIEM. Permite búsqueda rápida de strings.
3.  **IA (Analista Virtual):** Resumen generado automáticamente que explica la amenaza y sugiere pasos de mitigación.

### C. Registro de Acción Analista (Obligatorio)
Es mandatorio documentar cada hallazgo en el campo **Registro de Acción Analista**.
- Debe ser técnico, conciso y seguir el formato: `[HALLAZGO] + [ACCIÓN TOMADA]`.
- Ejemplo: *"[HALLAZGO] Se detectó IP origen 10.1.2.3 realizando escaneo UDP al puerto 514. [ACCIÓN] Se verificó con CMDB, IP pertenece a servidor de monitoreo autorizado. Falso Positivo."*

---

## 2. Gestión de Estados del Ticket

El estado del ticket determina su prioridad en los dashboards institucionales:

| Estado | Descripción | Acción Requerida |
| :--- | :--- | :--- |
| **Nuevo** | Ticket creado automáticamente o manualmente. | Evaluar y asignar responsable. |
| **Abierto / En Progreso** | El analista está trabajando activamente en la solución. | Actualizar comentarios técnicos periódicamente. |
| **Pendiente** | Se espera respuesta de una dependencia externa o del usuario. | Seguimiento semanal del SLA. |
| **Resuelto** | El incidente ha sido mitigado. | Documentar cierre y acciones de mejora. |
| **Cerrado** | Verificado por Coordinación SOC. | Estado inmutable final. |

---

## 3. Protocolo de Análisis Forense de E-mail (EML)

Para incidentes de Phishing, utilice el **Escáner Avanzado de EML**:
1. Subir el archivo `.eml` sospechoso.
2. Revisar la sección **Análisis de Amenaza**:
   - **Indicadores de Phishing:** Diferencias entre el `From` y el `Return-Path`.
   - **Análisis de Enlaces:** Verificación automática de URLs maliciosas.
   - **Adjuntos:** Detección de extensiones ejecutables peligrosas.
3. Si el análisis confirma Phishing, promover a Ticket de Seguridad inmediatamente.

---

## 4. Niveles de Severidad y SLA

| Severidad | Impacto | Tiempo de Respuesta (SLA) |
| :--- | :--- | :--- |
| **Crítica** | Compromiso de infraestructura central o fuga de datos. | < 15 minutos |
| **Alta** | Compromiso de una estación de trabajo o servidor secundario. | < 2 horas |
| **Media** | Escaneo de puertos, intentos fallidos de login masivos. | < 8 horas |
| **Baja** | Consultas administrativas, logs informativos. | < 24 horas |

---

## 5. Accesibilidad y Entorno de Trabajo

Para visualización prolongada en monitores de centro de mando (Video Wall):
- Se recomienda el **Modo SOC** (Fondo oscuro, alto contraste cian).
- El **Modo Alto Contraste** es mandatorio para reportes técnicos ante autoridades con discapacidad visual parcial, asegurando el cumplimiento de la guía ONTI.

---
*Versión del Documento: 1.0 - Febrero 2026*
*Desarrollado por: Ayudante Dominguez Fernando*
*División Seguridad Informática*

# ANEXO III — MANUAL DE PROCEDIMIENTOS OPERATIVOS (SOC)

## 1. FLUJO DE GESTIÓN DE INCIDENTES
Se establece el protocolo de actuación para el personal de guardia:

### 1.1. Recepción y Triaje
Al producirse una alerta en el SIEM, el ticket se crea automáticamente con estado **"Nuevo"**. El analista debe:
1.  Verificar la severidad asignada por el sistema.
2.  Consultar la sección **"Descripción Detallada"** para entender el contexto del evento.
3.  Utilizar el botón **"Ver Raw Logs"** para inspeccionar la evidencia técnica original.

### 1.2. Investigación y Escalamiento
Si la alerta es confirmada (Verdadero Positivo), se procede a:
1.  Cambiar el estado a **"En Progreso"**.
2.  Registrar comentarios técnicos sobre el análisis inicial.
3.  Vincular tickets relacionados si se detecta un patrón de ataque coordinado.

## 2. ANÁLISIS FORENSE DE CORREO ELECTRÓNICO (EML)
Se indica el procedimiento para el análisis de phishing y malware vía email:
*   **Ingesta:** Carga del archivo `.eml` en el módulo Forensics.
*   **Análisis de Cabeceras:** Verificación de saltos de red, SPF, DKIM y DMARC (automatizado).
*   **Extracción de IoCs:** El sistema identifica automáticamente IPs, URLs y dominios maliciosos.
*   **Cómputo de Hashes:** Generación de MD5/SHA256 de todos los adjuntos para su posterior consulta en bases de inteligencia de amenazas.

## 3. INTEGRACIÓN CON VIRUSTOTAL
Se deja constancia de que el sistema permite la consulta directa a VirusTotal. El analista puede verificar la reputación de cualquier indicador extraído con un solo clic, obteniendo el veredicto de múltiples motores antivirus de forma centralizada.

## 4. GESTIÓN DE CONOCIMIENTO (WIKI)
Se informa la integración de una base de conocimiento donde los analistas deben documentar las soluciones a incidentes recurrentes, permitiendo la creación de un repositorio institucional de lecciones aprendidas.

---
**DOCUMENTACIÓN TÉCNICA DE REFERENCIA — OPERACIONES DE CIBERSEGURIDAD**

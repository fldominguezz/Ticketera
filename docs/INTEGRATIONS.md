# Guía de Integraciones Externas

Este documento describe las conexiones técnicas entre la **Ticketera SOC** y los sistemas de monitoreo y gestión de conocimiento.

## 1. FortiSIEM (Ingesta de Alertas)

La integración permite que incidentes detectados por el SIEM se conviertan automáticamente en tickets de investigación.

### Flujo de Datos
1. **Detección:** FortiSIEM dispara una regla de notificación.
2. **Transporte:** Se envía un XML/JSON vía HTTP POST al endpoint del backend o vía Syslog (UDP 514).
3. **Procesamiento:** El backend valida el origen y mapea campos (Source IP, Hostname, Event Type).
4. **Creación:** Se genera un ticket con estado "Nuevo" y se asigna al grupo SOC.

### Configuración en FortiSIEM
- **Endpoint:** `https://<IP_TICKETERA>/api/v1/fortisiem-incident`
- **Método:** POST
- **Formato:** XML Custom / JSON

## 2. Docmost (Gestión de Procedimientos)

Se utiliza Docmost como Wiki técnica para almacenar los manuales de respuesta ante incidentes (Playbooks).

### Sincronización de Manuales
- Los procedimientos se importan desde archivos Markdown/PDF procesados.
- El sistema utiliza scripts de SQL para inyectar contenido directamente en la base de datos de Docmost, permitiendo la actualización masiva de manuales de ESET, Fortinet, Veeam, etc.
- **Ubicación de Imágenes:** Servidas vía Nginx desde `/app/uploads/wiki_media/`.

## 3. CMDB / Inventario Interno

El sistema correlaciona IPs detectadas en incidentes con la base de datos de activos para identificar rápidamente la criticidad del host afectado.

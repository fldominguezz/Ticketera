# Módulo de Ingesta SOC (v2.0)

Servicio especializado en la recepción, normalización y pre-procesamiento de eventos Syslog para la Ticketera SOC.

## Funcionalidades
*   **Receptor Syslog:** Escucha activa en puerto UDP 514.
*   **Normalización Inteligente:** Motores de regex para procesar logs crudos de FortiGate, ESET y FortiSIEM.
*   **Formateo de Salida:** Conversión a JSON estructurado con preservación de metadatos originales (Raw Log).
*   **Integración:** Comunicación segura vía API interna con el Backend de la Ticketera.

## Seguridad y Hardening
*   **Restricción por IP:** El servicio está configurado para descartar tráfico que no provenga de la IP autorizada del SIEM (ej: 10.1.78.10).
*   **Filtro de Ruido:** Descarte automático de logs informativos no críticos para optimizar el almacenamiento.
*   **Aislamiento:** El contenedor opera en una red Docker aislada con privilegios mínimos.

## Despliegue
Este módulo se gestiona íntegramente mediante `docker-compose`. Los logs de procesamiento pueden visualizarse con:
`docker logs -f ticketing-app-soc-module-1`

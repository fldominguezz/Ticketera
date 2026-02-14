# Módulo de Ingesta SOC

Servicio especializado en la recepción y pre-procesamiento de eventos Syslog para la Ticketera SOC.

## Funcionalidades
*   **Receptor Syslog:** Escucha en puerto UDP 514.
*   **Normalización:** Convierte logs crudos de FortiGate y otros dispositivos a formato JSON.
*   **Integración:** Envía alertas normalizadas al Backend de la Ticketera.

## Instalación
Este módulo se despliega automáticamente mediante Docker Compose.

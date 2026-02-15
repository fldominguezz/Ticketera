# ANEXO V — DESPLIEGUE, MANTENIMIENTO Y CONTINUIDAD (DRP)
**REFERENCIA:** SSI-2026-ANEXO-V-DETALLADO  

## 1. PROCEDIMIENTO DE DESPLIEGUE (DEPLOYMENT)
Se informa que el proceso de despliegue se encuentra totalmente automatizado y estandarizado:
1.  **Aprovisionamiento:** Configuración de host Linux con Docker Engine y Docker Compose.
2.  **Inyección de Configuración:** Preparación del archivo `.env` con las variables de entorno institucionales.
3.  **Compilación y Despliegue:** Ejecución de `docker-compose up --build -d`.
4.  **Migración Automática:** El contenedor del backend ejecuta `alembic upgrade head` para asegurar la paridad de la base de datos.
5.  **Inicialización de Datos:** Ejecución de scripts de carga de roles y usuarios iniciales.

## 2. POLÍTICA DE BACKUP Y RESPALDO
Se deja constancia de la estrategia de preservación de datos:
*   **Backups Diarios:** Ejecución programada de `pg_dumpall` para el respaldo íntegro de la base de datos PostgreSQL.
*   **Almacenamiento Redundante:** Copias almacenadas en volúmenes externos y sincronización cifrada con repositorio off-site (Regla 3-2-1).
*   **Retención:** Los respaldos se conservan por un período de 14 días para permitir recuperaciones puntuales ante errores humanos.

## 3. PLAN DE RECUPERACIÓN ANTE DESASTRES (DRP)
Se indica el protocolo de respuesta ante incidentes críticos de infraestructura:
*   **Escenario de Falla Total:** El RTO (Tiempo de Recuperación) se establece en 4 horas mediante la reconstrucción de contenedores y restauración de backups.
*   **Validación:** Se realizan simulacros de restauración trimestrales para asegurar la integridad de los archivos de respaldo.

## 4. MANTENIMIENTO PREVENTIVO
Se informa la realización de tareas periódicas:
*   Limpieza de volúmenes Docker huérfanos.
*   Rotación de logs de aplicación para evitar saturación de disco.
*   Auditoría de versiones de librerías y parches de seguridad de imágenes base.

---
**DOCUMENTACIÓN TÉCNICA DE REFERENCIA — INFRAESTRUCTURA TÉCNICA**

# Manual de Operaciones y Mantenimiento

Este documento establece los procedimientos operativos estándar para el mantenimiento, monitoreo y recuperación ante desastres del sistema **Ticketera SOC**.

## 1. Gestión de Servicios (Docker)

El sistema opera bajo Docker Compose. Todos los comandos deben ejecutarse desde el directorio raíz del proyecto (donde se encuentra `docker-compose.yml`).

### Comandos Básicos
*   **Ver estado de servicios:**
    ```bash
    docker-compose ps
    ```
*   **Reiniciar un servicio específico (ej: backend):**
    ```bash
    docker-compose restart backend
    ```
*   **Ver logs en tiempo real (todos los servicios):**
    ```bash
    docker-compose logs -f
    ```
*   **Ver logs de un servicio específico:**
    ```bash
    docker-compose logs -f --tail=100 backend
    ```

## 2. Copias de Seguridad (Backup)

La estrategia de respaldo se centra en la base de datos PostgreSQL y los archivos adjuntos subidos por los usuarios.

### Script de Backup Automático
El sistema incluye un script `daily_backup.sh` programado para ejecutarse diariamente (vía CRON del host).

1.  **Ubicación del script:** `scripts/infrmake backup`
2.  **Destino de backups:** `/root/Ticketera/backups/`
3.  **Contenido del backup:**
    *   Dump SQL comprimido (`.sql.gz`) de la base de datos completa.
    *   Copia comprimida (`.tar.gz`) del directorio `uploads/`.

### Ejecución Manual de Backup
```bash
make backup
```

### Procedimiento de Restauración (Restore)
**¡ADVERTENCIA!** Este proceso sobrescribe los datos actuales.

1.  Detener el servicio de aplicación para evitar escrituras:
    ```bash
    docker-compose stop backend frontend
    ```
2.  Copiar el archivo de backup al contenedor de base de datos (o usar `cat`):
    ```bash
    zcat backups/db_backup_YYYY-MM-DD.sql.gz | docker-compose exec -T db psql -U <DB_USER> -d <DB_NAME>
    ```
3.  Restaurar archivos adjuntos:
    ```bash
    tar -xzvf backups/uploads_backup_YYYY-MM-DD.tar.gz -C ./
    ```
4.  Reiniciar servicios:
    ```bash
    docker-compose start
    ```

## 3. Mantenimiento de Logs

Los contenedores Docker acumulan logs que pueden llenar el disco.

### Política de Rotación
*   **Configuración Docker:** El archivo `docker-compose.yml` debe tener configurado el driver de logging para rotar archivos (ej: `max-size: "10m"`, `max-file: "3"`).
*   **Limpieza manual:** Si el disco se llena, se puede ejecutar:
    ```bash
    # Borrar todos los contenedores detenidos, redes e imágenes no usadas
    docker system prune -a
    ```

## 4. Monitoreo Básico

### Verificación de Salud (Healthcheck)
*   **Backend:** Consultar `GET /api/v1/health` o `GET /` (debe devolver 200 OK).
*   **Base de Datos:** Verificar conectividad del puerto 5432 desde el contenedor backend.

### Recursos del Servidor
Vigilar regularmente:
*   Espacio en disco (`df -h`). Especial atención a `/var/lib/docker` y al directorio del proyecto.
*   Memoria RAM (`free -h` o `htop`).

## 5. Procedimientos de Emergencia

### Servicio Web Caído (502 Bad Gateway)
1.  Verificar si Nginx está corriendo: `docker-compose ps nginx`.
2.  Verificar si el Backend está corriendo: `docker-compose ps backend`.
3.  Revisar logs de Nginx y Backend para identificar el error.

### Base de Datos Corrupta
1.  Si PostgreSQL no inicia, revisar logs: `docker-compose logs db`.
2.  Si es irrecuperable, proceder con el **Procedimiento de Restauración** utilizando el backup válido más reciente.

### Bloqueo de Cuenta Admin
Si se pierde el acceso a la cuenta de administrador:
1.  Acceder a la consola del backend:
    ```bash
    docker-compose exec backend bash
    ```
2.  Ejecutar script de reset (si existe) o modificar manualmente vía Python shell/SQL.

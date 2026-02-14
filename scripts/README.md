# Toolkit de Mantenimiento y Operaciones

Este directorio contiene scripts especializados para la gestión administrativa y técnica de la Ticketera SOC fuera de la interfaz de usuario.

## Directorios

### 📂 infra/
Scripts relacionados con la infraestructura base.
*   `daily_backup.sh`: Ejecuta el respaldo completo de base de datos y archivos adjuntos.

### 📂 mantenimiento/
Scripts de emergencia y corrección de datos.
*   `emergency_reset_admin.py`: Restablece la cuenta de administrador principal.
*   `fix_slas.py`: Recalcula y corrige discrepancias en los tiempos de respuesta.
*   `sync_meilisearch.py`: Sincroniza el motor de búsqueda con la base de datos PostgreSQL.
*   `reset_user_passwords.py`: Utilidad para blanqueo masivo de credenciales.

### 📂 data/
Scripts para la manipulación y migración de datos.
*   `import_locations.sql`: Definición base de la jerarquía de dependencias.

## Modo de Uso
La mayoría de los scripts de Python deben ejecutarse dentro del contenedor de backend para aprovechar las variables de entorno y el acceso a la base de datos:

```bash
docker-compose exec backend python scripts/mantenimiento/nombre_del_script.py
```

#!/bin/bash
# Ticketera SOC - Script de Respaldo Portátil
# Autor: fdominguezz

BASE_DIR=$(cd "$(dirname "$0")/../.." && pwd)
BACKUP_DIR="$BASE_DIR/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Cargar variables de entorno para obtener el nombre del proyecto
if [ -f "$BASE_DIR/.env" ]; then
    export $(grep -v '^#' "$BASE_DIR/.env" | xargs)
fi

# Usar COMPOSE_PROJECT_NAME si existe, sino 'ticketera' por defecto
PROJECT_NAME=${COMPOSE_PROJECT_NAME:-ticketera}
DB_CONTAINER="${PROJECT_NAME}-db-1"

mkdir -p "$BACKUP_DIR"

echo "Iniciando respaldo de Ticketera SOC (Proyecto: $PROJECT_NAME) en $BASE_DIR..."

# 1. Respaldo de Base de Datos
docker exec -t "$DB_CONTAINER" pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-ticketera_db}" | gzip > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"

# 2. Respaldo de Adjuntos y Configuración
tar -czf "$BACKUP_DIR/files_backup_$TIMESTAMP.tar.gz" -C "$BASE_DIR" uploads .env

# 3. Limpieza de respaldos antiguos
find "$BACKUP_DIR" -type f -mtime +7 -delete

echo "Respaldo completado con éxito: $BACKUP_DIR"

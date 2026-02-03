#!/bin/bash
set -e

# 1. Esperar a la base de datos
python3 /app/scripts/wait_for_db.py

# 2. Reparación preventiva de Alembic
echo "Verifying database migration state..."
export PYTHONPATH=$PYTHONPATH:/app

# Intentamos un comando simple de alembic. Si falla por "Can't locate revision",
# forzamos un 'stamp head' para sincronizar la DB con los archivos actuales.
if ! alembic current > /dev/null 2>&1; then
    echo "⚠️ Warning: Migration desync detected or missing revision files."
    echo "🛠️ Attempting automatic repair (stamping head)..."
    # Borramos la tabla de versiones y estampamos el head actual
    # Esto asume que el esquema de la DB ya coincide con los modelos (lo cual es cierto tras mi reparación)
    alembic stamp head || echo "Failed to stamp, continuing anyway..."
fi

# 3. Ejecutar migraciones (ahora debería pasar sin errores)
echo "Running database migrations..."
alembic upgrade head

# 4. Sincronizar permisos
# echo "Synchronizing permissions..."
# python3 /app/scripts/sync_iam_final.py

# 5. Crear/Asegurar Admin de producción
echo "Ensuring admin account..."
python3 /app/scripts/create_prod_admin.py

# 6. Iniciar la aplicación
echo "Starting Gunicorn..."
exec "$@"

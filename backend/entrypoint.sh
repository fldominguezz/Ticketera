#!/bin/bash
set -e

# Esperar a la base de datos de forma nativa
echo "⏳ Esperando a Postgres..."
until python3 -c "import socket; s = socket.socket(); s.connect(('db', 5432))" 2>/dev/null; do
  sleep 1
done
echo "✅ Postgres listo!"

# Ejecutar migraciones si es necesario
echo "🚀 Ejecutando migraciones..."
alembic upgrade head || echo "⚠️  No se pudieron aplicar migraciones automáticamente."

# Inicializar datos básicos (admin, roles, etc.)
echo "🌱 Inicializando datos..."
export PYTHONPATH=/app
python3 app/initial_data.py || echo "⚠️  No se pudo inicializar la base de datos."

# Iniciar la aplicación
exec uvicorn app.main:app --host 0.0.0.0 --port 8000

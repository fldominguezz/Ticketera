#!/bin/sh
set -e

# Generar certificado autofirmado si no existe
if [ ! -f /etc/nginx/ssl/nginx.crt ]; then
    echo "Generando certificado SSL autofirmado..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/nginx.key \
        -out /etc/nginx/ssl/nginx.crt \
        -subj "/C=AR/ST=Buenos Aires/L=CABA/O=CyberCase/CN=${DOMAIN_NAME:-localhost}"
fi

# Reemplazar la variable __DOMAIN_NAME__ en la configuración con el valor del entorno
# Si no está definida, usar 'localhost'
TARGET_DOMAIN=${DOMAIN_NAME:-localhost}
echo "Configurando Nginx para el dominio: $TARGET_DOMAIN"
sed -i "s/__DOMAIN_NAME__/$TARGET_DOMAIN/g" /etc/nginx/conf.d/default.conf

# Ejecutar el comando original (nginx)
exec "$@"

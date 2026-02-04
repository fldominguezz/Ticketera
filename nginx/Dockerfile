FROM nginx:alpine

# Instalar openssl para generar certificados y gettext para envsubst si fuera necesario
RUN apk add --no-cache openssl curl

COPY nginx.conf /etc/nginx/nginx.conf
COPY security_headers.conf /etc/nginx/security_headers.conf
COPY conf.d/ /etc/nginx/conf.d/

# Crear directorio ssl
RUN mkdir -p /etc/nginx/ssl

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
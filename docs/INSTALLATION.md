# Guía de Instalación y Despliegue

Este documento detalla el procedimiento técnico para instalar, configurar y desplegar el sistema **Ticketera SOC** en un entorno de producción o desarrollo.

## Requisitos del Sistema

### Hardware Mínimo Recomendado
*   **CPU:** 2 vCPU.
*   **RAM:** 4 GB (8 GB recomendado para producción con alta carga).
*   **Almacenamiento:** 20 GB SSD (para sistema operativo, imágenes Docker y base de datos inicial).

### Software Base
*   **Sistema Operativo:** Linux (Ubuntu 20.04/22.04 LTS, Debian 11/12, o RHEL 8/9).
*   **Docker Engine:** Versión 20.10.x o superior.
*   **Docker Compose:** Versión 2.x o superior.
*   **Git:** Para clonar el repositorio.

## Procedimiento de Instalación

### 1. Clonar el Repositorio
Acceda al servidor vía SSH y clone el proyecto en el directorio deseado (ej: `/opt` o `/home`).

```bash
git clone <URL_DEL_REPOSITORIO> Ticketera
cd Ticketera
```

### 2. Configuración de Variables de Entorno
El sistema utiliza un archivo `.env` para gestionar credenciales y configuraciones sensibles. 

**Importante:** Nunca suba el archivo `.env` de producción al repositorio.

Copie el archivo de ejemplo:
```bash
cp .env.example .env
```

Edite el archivo `.env` con sus parámetros:
```bash
nano .env
```

Parámetros críticos a configurar:
*   `POSTGRES_USER` / `POSTGRES_PASSWORD`: Credenciales de la base de datos.
*   `SECRET_KEY`: Llave aleatoria robusta (generar con `openssl rand -hex 32`) para la firma de tokens JWT.
*   `DOMAIN`: Dominio o IP pública del servidor (para Nginx y CORS).
*   `FIRST_SUPERUSER` / `FIRST_SUPERUSER_PASSWORD`: Credenciales del primer administrador.

### 3. Construcción y Despliegue
Ejecute Docker Compose para construir las imágenes y levantar los servicios en segundo plano.

```bash
# Construir imágenes (puede tardar unos minutos la primera vez)
docker-compose build

# Levantar servicios
docker-compose up -d
```

### 4. Verificación del Despliegue
Verifique que los cuatro contenedores principales estén corriendo (`frontend`, `backend`, `db`, `nginx`).

```bash
docker-compose ps
```
El estado debe ser `Up`.

Verifique logs en caso de error:
```bash
docker-compose logs -f backend
```

## Inicialización de Base de Datos
Al primer inicio, el backend intentará conectarse a PostgreSQL. Alembic ejecutará las migraciones automáticamente para crear las tablas.

Si necesita poblar la base de datos con datos iniciales (roles, permisos):
```bash
docker-compose exec backend python app/initial_data.py
```

## Configuración de SSL/TLS (Producción)
Por defecto, Nginx está configurado para HTTP o certificados autofirmados. Para producción, se recomienda instalar certificados válidos (ej: Let's Encrypt).

1.  Coloque su certificado (`bundle.crt`) y llave privada (`private.key`) en `nginx/ssl/`.
2.  Edite `nginx/conf.d/default.conf` para apuntar a los nombres de archivo correctos.
3.  Reinicie Nginx:
    ```bash
    docker-compose restart nginx
    ```

## Actualización del Sistema
Para desplegar una nueva versión del código:

1.  Bajar cambios: `git pull origin main`
2.  Reconstruir: `docker-compose build`
3.  Reiniciar servicios: `docker-compose up -d`
4.  (Opcional) Limpiar imágenes viejas: `docker system prune -f`

## Troubleshooting Común

*   **Error de conexión a DB:** Verifique que las credenciales en `.env` coincidan con las que PostgreSQL espera (si ya existía el volumen, las credenciales viejas persisten).
*   **Puerto 80/443 ocupado:** Asegúrese que no haya otro servidor web (Apache/Nginx local) corriendo en el host (`sudo systemctl stop nginx`).
*   **Permisos de archivos:** Asegúrese que el usuario que corre docker tenga permisos sobre la carpeta `uploads/`.

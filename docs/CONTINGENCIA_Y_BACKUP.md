# 🔄 Plan de Continuidad y Contingencia Técnica

Este documento detalla los procedimientos para asegurar la disponibilidad de la **Ticketera SOC** y la integridad de sus datos, conforme a los lineamientos de sustentabilidad de la ONTI.

---

## 1. Estrategia de Backup (Respaldo)

El sistema cuenta con una política de respaldo automatizada para tres componentes críticos:

1.  **Base de Datos (PostgreSQL):** 
    - Respaldo diario de la base de datos `ticketera_prod_db`.
    - Comando de ejecución: `docker exec ticketera-db pg_dump -U ticketera_admin ticketera_prod_db > backup_$(date +%F).sql`
2.  **Archivos Adjuntos (Uploads):**
    - Sincronización de la carpeta `/app/uploads` con almacenamiento externo seguro.
3.  **Variables de Entorno:**
    - Copia cifrada del archivo `.env` en el gestor de secretos institucional.

## 2. Recuperación ante Desastres (Disaster Recovery)

En caso de pérdida total del servidor host:
1.  Instalar Docker y Docker Compose en el nuevo nodo.
2.  Clonar el repositorio oficial de GitHub.
3.  Restaurar el archivo `.env` con las claves maestras.
4.  Ejecutar `make start`.
5.  Importar el último dump SQL: `cat backup.sql | docker exec -i ticketera-db psql -U ticketera_admin -d ticketera_prod_db`.

## 3. Sustentabilidad del Software

-   **Containerización:** Al estar basado en Docker, el software no depende de librerías específicas del sistema operativo host, facilitando su migración entre servidores o nubes (Híbrida/Privada).
-   **Actualizaciones Sin Parada:** Se utiliza el comando `docker-compose up -d --build` para aplicar parches de seguridad en el código sin interrumpir el servicio de base de datos.

---
**Desarrollado por:** Ayudante Dominguez Fernando
**Fecha:** Febrero 2026

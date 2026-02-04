# 🛡️ Ticketera SOC
### Orquestador Integral de Incidentes de Ciberseguridad

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Production Ready](https://img.shields.io/badge/Status-Production--Ready-success.svg)](#)
[![Validated](https://img.shields.io/badge/QA-E2E--Validated-blue.svg)](#)

**Ticketera SOC** no es solo un gestor de tickets; es una plataforma de misión crítica diseñada para centralizar, automatizar y auditar el ciclo de vida de los incidentes de seguridad. Creada específicamente para Centros de Operaciones de Seguridad (SOC), actúa como el puente crítico entre la detección automática (SIEM) y la respuesta operativa humana.

---

## 🚀 Valor Estratégico

En el ecosistema de ciberseguridad actual, la velocidad de respuesta es la diferencia entre un incidente contenido y un desastre de datos. Este sistema optimiza el flujo de trabajo del analista mediante:

*   **⚡ Ingesta Automática (SIEM Ready):** Módulo especializado para recibir alertas vía Syslog (UDP 514) y procesar logs crudos de FortiSIEM/FortiGate.
*   **🔐 Seguridad Hardened:** Autenticación de doble factor (2FA) integrada, Control de Acceso Basado en Roles (RBAC) y auditoría inmutable.
*   **🔎 Búsqueda Forense:** Motor Meilisearch integrado para indexación y búsqueda ultra-rápida de históricos.
*   **📊 Observabilidad Operativa:** Dashboards en tiempo real (WebSockets) y stack de monitoreo integrado (Prometheus/Grafana).
*   **🛡️ Soberanía de Datos:** Despliegue 100% On-Premise basado en Docker, sin dependencia de nubes externas.

---

## 🏗️ Arquitectura Técnica

El sistema utiliza una arquitectura de microservicios orquestada, garantizando portabilidad y aislamiento:

| Componente | Tecnología |
| :--- | :--- |
| **Frontend** | Next.js 14 (TypeScript), React Bootstrap |
| **Backend** | FastAPI (Python 3.11) asíncrono |
| **Base de Datos** | PostgreSQL 16 |
| **Caché / Sesiones** | Redis 7 |
| **Búsqueda** | Meilisearch |
| **Infraestructura** | Docker Compose, Nginx (Reverse Proxy) |

---

## 🛠️ Guía de Instalación Rápida (Zero Errors)

### Requisitos Previos
*   Docker Engine 24.0+ y Docker Compose V2.
*   Puertos disponibles: `80`, `443`, `514` (UDP).

### Paso 1: Clonar el Repositorio
```bash
git clone https://github.com/fldominguezz/Ticketera.git
cd Ticketera
```

### Paso 2: Configurar Variables de Entorno
Crea un archivo `.env` a partir de la plantilla genérica:
```bash
cp .env.example .env
```
*Edita el archivo `.env` y ajusta el valor de `DOMAIN_NAME` con la IP de tu servidor (Ej: `10.1.1.1`).*

### Paso 3: Desplegar
```bash
# Este comando construye las imágenes y levanta todos los servicios en segundo plano
docker-compose up --build -d
```

### Paso 4: Acceso e Inicio
1.  Ingresa a: `https://tu-ip-o-dominio` (Ej: `https://10.1.1.1`).
2.  Acepta el certificado de seguridad (Autofirmado por Nginx en el arranque).
3.  Inicia sesión con las credenciales de `FIRST_SUPERUSER` definidas en tu `.env`.

---

## 🔧 Mantenimiento y Operaciones

### Ver estado de los servicios
```bash
docker-compose ps
```

### Consultar logs del Backend (Debug)
```bash
docker-compose logs -f backend
```

### Backup de seguridad de la Base de Datos
```bash
docker exec ticketera-db-1 pg_dump -U operador_db ticketera_db > backup_soc_$(date +%F).sql
```

### Actualización del Sistema
```bash
git pull origin main
docker-compose up --build -d
```

---

## 🛡️ Validación de Calidad
Este repositorio incluye un **Agente de Validación Automática** (`validator/`) que ejecuta pruebas E2E con **Playwright** en cada despliegue, asegurando que el motor de autenticación, la conexión a la base de datos y la creación de tickets estén operativos al 100%.

---
Desarrollado para entornos de misión crítica. Bajo licencia MIT.
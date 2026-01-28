# CyberCase SOC Orchestrator 🛡️

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js-000000?logo=nextdotjs)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Deployment-Docker-2496ED?logo=docker)](https://www.docker.com/)

**CyberCase SOC Orchestrator** es una plataforma integral de gestión de incidentes y activos diseñada específicamente para Centros de Operaciones de Seguridad (SOC) modernos. Actúa como el puente crítico entre la ingestión de datos crudos del SIEM y la respuesta orquestada ante incidentes.

---

## 🚀 Valor Estratégico

En el ecosistema de ciberseguridad actual, la velocidad de respuesta es la diferencia entre un incidente contenido y un desastre de datos. CyberCase optimiza el flujo de trabajo del analista mediante:

- **Reducción de Fatiga por Alertas:** Agrupación inteligente y enriquecimiento automático de eventos SIEM.
- **Trazabilidad Forense:** Cada cambio, comentario o adjunto queda registrado en un log de auditoría inmutable.
- **Cumplimiento y SLA:** Monitoreo en tiempo real de tiempos de respuesta y resolución.
- **Privacidad por Diseño:** Aislamiento estricto de datos por grupos y áreas operativas.

---

## ✨ Funciones Core

### 1. Monitor de Eventos SIEM Profesional
- **Parser Inteligente:** Procesa automáticamente logs en formatos XML (FortiSIEM), JSON y Key-Value (Fortinet/Syslog).
- **Visor Estructurado:** Desglose automático de IPs de origen/destino, puertos, protocolos y técnicas **MITRE ATT&CK**.
- **Laboratorio RAW:** Herramienta profesional de análisis de logs con resaltado de sintaxis, búsqueda interna y herramientas de exportación.

### 2. Inventario de Activos 360°
- **Gestión Jerárquica:** Árbol de ubicaciones dinámico con búsqueda ultra-rápida.
- **Seguimiento Técnico:** Historial completo de instalaciones, movimientos y cambios de estado de cada equipo.
- **Importación Inteligente:** Soporte nativo para reportes de ESET Cloud y FortiClient EMS.

### 3. Gestión de Incidentes (Ticketing SOC)
- **Colaboración Proactiva:** Sistema de menciones (`@usuario`) con notificaciones en tiempo real.
- **Gestión de Evidencias:** Carga múltiple de archivos con visor de pre-carga y control de integridad.
- **Control de Acceso Dinámico:** Reglas de estado estrictas que bloquean la alteración de casos resueltos.

### 4. Seguridad de Grado Empresarial
- **Autenticación Multi-Factor (2FA):** Soporte obligatorio de TOTP (Google Authenticator, Authy).
- **Hardening de Sesiones:** Control de concurrencia y expiración de tokens JWT.
- **RBAC Robusto:** Permisos granulares basados en roles y grupos jerárquicos.

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
| :--- | :--- |
| **Backend** | FastAPI (Python 3.9), SQLAlchemy 2.0, Alembic |
| **Frontend** | Next.js 14, React, Bootstrap 5, Lucide Icons |
| **Gráficos** | Recharts (Data Visualization) |
| **Base de Datos** | PostgreSQL 16 |
| **Caché/Sesiones** | Redis 7 |
| **Infraestructura** | Docker Compose, Nginx (Reverse Proxy) |

---

## 📥 Instalación Rápida

```bash
# 1. Clonar el repositorio
git clone https://github.com/cibercase-ds/cybercase-soc.git
cd cybercase-soc

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Desplegar con Docker
docker compose up -d --build
```

---

## 📖 Manual de Usuario

Para obtener una guía detallada sobre cómo operar la plataforma, consulta nuestro [Manual de Usuario](./docs/USER_MANUAL.md).

## 🛡️ Soporte y Licencia

Desarrollado para entornos de misión crítica. Bajo licencia MIT. Para soporte especializado, contactar a la División de Seguridad Informática de CyberCase.

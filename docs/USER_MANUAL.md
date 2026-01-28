# Manual de Usuario: CyberCase SOC Orchestrator 📖

## 🎯 Introducción
Este manual está diseñado para analistas de seguridad, técnicos de campo y administradores del sistema CyberCase.

---

## 💻 Dashboard Principal
El Dashboard es su centro de comando. Aquí encontrará:
- **Estadísticas de Tickets:** Casos abiertos, en proceso y resueltos.
- **Métricas SIEM:** Volumen de alertas detectadas y categorización por severidad.
- **Estado del Inventario:** Conteo de equipos operativos y pendientes de etiquetado.

---

## 🚨 Monitor de Alertas SOC
Ubicado en la sección **Alertas SIEM**, es donde ocurre la magia del análisis.

### Flujo de Trabajo del Analista:
1.  **Revisión:** Haga clic en "GESTIONAR" en cualquier alerta pendiente.
2.  **Análisis Estructurado:** Observe la pestaña "EVENTO ESTRUCTURADO" para identificar rápidamente el **Hostname**, la **IP de origen** y la **Regla disparada**.
3.  **Análisis Profundo:** Si necesita ver el log original, vaya a "EVENTO CRUDO (RAW)". Use el buscador (`Ctrl+F` o barra de búsqueda) para encontrar patrones dentro del log.
4.  **Remediación:** 
    - Escriba sus observaciones en el cuadro de texto.
    - Adjunte evidencias (capturas de pantalla, logs de PCAP, etc.).
    - Mencione a otros compañeros si necesita ayuda usando `@usuario`.
    - Cambie el estado a "MITIGADO / RESUELTO" para cerrar el ciclo.

---

## 💻 Inventario de Activos
Permite mantener un control exhaustivo del hardware de la organización.

- **Búsqueda Inteligente:** En la parte superior, busque por Hostname, IP o MAC.
- **Árbol de Ubicaciones:** Navegue jerárquicamente por las oficinas o departamentos. Use el filtro local para encontrar carpetas rápidamente.
- **Historial del Activo:** Al entrar al detalle de un equipo, verá cada vez que fue movido de ubicación o que se le realizó un servicio técnico.

---

## 🎫 Gestión de Casos (Tickets)
Para incidencias que no provienen del SIEM (ej. instalaciones, fallas de hardware).

- **Vincular Equipos:** Al crear un ticket, siempre use la barra de "Vincular Equipo" para que la incidencia quede guardada en el historial de ese activo.
- **Bloqueo de Seguridad:** Recuerde que una vez que marque un ticket como "RESOLVED" o "CLOSED", no podrá modificarlo a menos que sea un Administrador. Esto garantiza la integridad de la auditoría.

---

## 🛡️ Seguridad Personal
- **2FA:** En su primer login, el sistema le obligará a escanear un código QR. Use Google Authenticator o Authy. **Guarde sus códigos de recuperación**.
- **Perfil:** En su perfil puede ver su información básica y confirmar que su cuenta está protegida con 2FA.

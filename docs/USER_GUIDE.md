# Guía de Usuario - Ticketera SOC

Esta guía está dirigida a los operadores, analistas y administradores que interactúan diariamente con el sistema **Ticketera SOC**.

## Acceso al Sistema

1.  Abra su navegador web (Chrome, Firefox o Edge recomendados).
2.  Ingrese la URL proporcionada por el equipo de infraestructura (ej: `https://soc-ticketera.interno`).
3.  Ingrese su correo electrónico institucional y contraseña.
4.  Haga clic en "Iniciar Sesión".

**Nota:** Si es su primer ingreso, es posible que el sistema le solicite cambiar su contraseña temporal.

## Roles y Permisos

Su experiencia en el sistema dependerá de su rol asignado:

*   **Operador / Nivel 1:** Puede ver tickets asignados, crear nuevos tickets manuales y añadir comentarios básicos.
*   **Analista / Nivel 2:** Puede reasignar tickets, cambiar estados, cerrar incidentes y ver detalles técnicos del SIEM.
*   **Administrador:** Acceso total a la gestión de usuarios, configuración del sistema y reportes de auditoría.

## Flujos de Trabajo Principales

### 1. Gestión de Tickets

#### Dashboard Principal
Al ingresar, verá el tablero de control con métricas clave:
*   Tickets abiertos por severidad (Crítica, Alta, Media, Baja).
*   Tickets asignados a usted.
*   Gráficos de tendencia de incidentes.

#### Crear un Ticket Manualmente
1.  Haga clic en el botón **"Nuevo Ticket"** en la barra lateral o superior.
2.  Complete el formulario:
    *   **Título:** Breve descripción del incidente.
    *   **Descripción:** Detalles completos.
    *   **Prioridad:** Asigne según la urgencia.
    *   **Tipo:** (Ej: Malware, Phishing, Acceso Indebido).
3.  Haga clic en **"Guardar"**.

#### Trabajar un Ticket
1.  Haga clic en el ID o título de un ticket en la lista.
2.  En la vista de detalle puede:
    *   **Cambiar Estado:** De "Nuevo" a "En Progreso", "Pendiente" o "Cerrado".
    *   **Añadir Comentarios:** Registre sus hallazgos y acciones tomadas. Use el editor de texto para dar formato.
    *   **Ver Logs Asociados:** Si el ticket vino del SIEM, verá una pestaña con los eventos "raw" (crudos).

### 2. Gestión de Usuarios (Solo Administradores)

1.  Navegue a **Admin > Usuarios**.
2.  **Crear Usuario:** Botón "Nuevo Usuario". Ingrese email, nombre y rol inicial.
3.  **Editar/Desactivar:** Use los iconos de acción en la fila del usuario correspondiente.

### 3. Reportes

El sistema permite exportar listados de incidentes.
1.  Vaya a la sección de **Reportes** o use los filtros en la lista de tickets.
2.  Seleccione el rango de fechas.
3.  Exporte a formato CSV o PDF (según disponibilidad).

## Buenas Prácticas para el Operador

*   **Documentación:** Sea detallado en sus comentarios. Un ticket bien documentado es clave para futuras auditorías.
*   **Clasificación:** Intente clasificar correctamente la severidad. No marque todo como "Crítico".
*   **Seguridad:** Cierre su sesión si se aleja de su puesto de trabajo. No comparta su contraseña.

## Soporte

Si encuentra un error en el sistema o tiene problemas de acceso, contacte al Administrador del Sistema o envíe un correo a la mesa de ayuda interna.

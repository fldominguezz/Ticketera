# Guía de Contribución - Ticketera SOC

Bienvenido al equipo de desarrollo. Para mantener la calidad y seguridad del sistema, solicitamos seguir estos lineamientos.

## Estándares de Código
*   **Backend (Python):** Seguir PEP 8. Usar Type Hints y validación vía Pydantic v1.x (actualmente en transición).
*   **Frontend (React):** TypeScript obligatorio. Uso de componentes funcionales y Material UI/Bootstrap.
*   **Temas Visuales:** Es OBLIGATORIO validar cualquier cambio de UI en los 4 modos: **SOC**, **Dark**, **Light** y **Alto Contraste**.
*   **Documentación:** Todo cambio funcional debe reflejarse en el `CHANGELOG.md` y en la carpeta `docs/`.

## Flujo de Trabajo (Git)
1.  Crear una rama descriptiva: `feature/nueva-funcionalidad` o `fix/error-especifico`.
2.  Realizar commits atómicos con mensajes en presente (ej: "add: endpoint de reporte").
3.  Asegurar que los tests E2E y el check de sintaxis del CI pasen.

## Seguridad
*   NUNCA subir archivos `.env` o secretos al repositorio.
*   Toda nueva funcionalidad debe respetar el modelo RBAC existente.

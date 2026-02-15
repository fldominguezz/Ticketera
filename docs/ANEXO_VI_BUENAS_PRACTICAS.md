# ANEXO VI — BUENAS PRÁCTICAS, CALIDAD Y ÉTICA EN IA
**REFERENCIA:** SSI-2026-ANEXO-VI-DETALLADO  

## 1. ESTÁNDARES DE DESARROLLO (ONTI)
Se informa que el desarrollo del sistema se ajusta a las directrices de la ONTI para el Sector Público Nacional:
*   **Soberanía Tecnológica:** Uso de software libre y estándares abiertos para evitar el bloqueo por parte de proveedores (lock-in).
*   **Clean Architecture:** Implementación de una arquitectura limpia que separa la lógica de negocio de los detalles de implementación (como la DB o el framework web).
*   **Testabilidad:** Diseño orientado a la ejecución de pruebas unitarias automáticas para asegurar la calidad en cada iteración.

## 2. BUENAS PRÁCTICAS DE PROGRAMACIÓN
Se deja constancia de la aplicación de principios **SOLID** y **DRY (Don't Repeat Yourself)**.
*   **Código Documentado:** Uso de Docstrings y tipado estático en Python para facilitar el mantenimiento por parte de otros equipos técnicos.
*   **Versionado Semántico:** Uso de Git para el control de versiones, permitiendo la trazabilidad histórica de cada cambio realizado en el código fuente.

## 3. ÉTICA Y PRIVACIDAD EN IA
Se indica que el uso de modelos de inteligencia artificial (Asistente Virtual) se rige por principios éticos:
*   **Supervisión Humana:** Ninguna decisión de seguridad es delegada íntegramente a la IA. El analista humano siempre tiene la última palabra y supervisa las sugerencias generadas.
*   **Transparencia:** El sistema informa cuándo una respuesta o resumen ha sido generado artificialmente.
*   **Privacidad:** Los datos utilizados para el análisis forense no abandonan la infraestructura institucional, garantizando que la información sensible no sea utilizada para el entrenamiento de modelos externos.

---
**DOCUMENTACIÓN TÉCNICA DE REFERENCIA — CALIDAD DE SOFTWARE**

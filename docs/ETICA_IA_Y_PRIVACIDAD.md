# 🤖 Ética, Transparencia y Privacidad en el uso de IA

La plataforma **Ticketera SOC** integra capacidades de Inteligencia Artificial para la asistencia en el triage técnico. Este documento describe los principios bajo los cuales opera esta tecnología.

---

## 1. Privacidad de Datos (Local-First AI)

A diferencia de las soluciones comerciales que envían datos a nubes externas (como OpenAI o Anthropic), este sistema utiliza **Modelos de Lenguaje Locales (LLM)** a través de la infraestructura **Ollama**.

-   **Sin Fuga de Datos:** Los logs de seguridad y descripciones de tickets **nunca salen del servidor institucional**.
-   **Procesamiento Offline:** El sistema puede realizar análisis de IA sin necesidad de conexión a internet, cumpliendo con los requisitos de redes aisladas de alta seguridad.

## 2. El Principio "Human-in-the-Loop"

La IA en este sistema actúa como un **Analista Virtual Asistente**, no como un tomador de decisiones autónomo.

-   **Sugerencias, no Órdenes:** La IA proporciona resúmenes y pasos de remediación, pero es el **Analista Humano** quien debe validar y ejecutar el cierre del ticket.
-   **Responsabilidad:** Todas las acciones finales son atribuidas al usuario que las confirma, manteniendo la cadena de responsabilidad institucional.

## 3. Transparencia Algorítmica

El sistema permite ver el `raw log` (log original) que la IA analizó, asegurando que el analista siempre pueda contrastar la sugerencia de la IA con la evidencia técnica cruda.

---
**Desarrollado por:** Ayudante Dominguez Fernando
**Alineado con:** Recomendaciones de Ética en IA para el Sector Público (ONTI).

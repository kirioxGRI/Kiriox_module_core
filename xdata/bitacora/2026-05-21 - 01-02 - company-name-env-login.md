# Bitacora de actividad

- Fecha: 2026-05-21 01:02:00
- Tarea: Usar COMPANY_NAME de .env para el combobox Empresa en login
- Contexto: El login era un componente cliente y no debia leer process.env directamente
- Acciones: Se movio la lectura de COMPANY_NAME al wrapper server src/app/login/page.tsx y se paso companyName como prop al componente cliente

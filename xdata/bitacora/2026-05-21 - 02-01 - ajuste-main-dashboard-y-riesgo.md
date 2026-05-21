# Bitacora de actividad

- Fecha: 2026-05-21 02:01:00
- Tarea: Mover launchpad central a /main_dashboard y restaurar /score/dashboard2 como dashboard de gestion de riesgo
- Ajuste clave: El middleware ahora respeta DEV_AUTH_BYPASS para evitar redirecciones espurias a /login en desarrollo
- Acciones: Se creo src/app/main_dashboard/page.tsx, se restauro src/app/score/dashboard2/page.tsx, se actualizaron redirects del login y root, y se corrigieron enlaces del topbar y launchpad
- Estado consolidado: /main_dashboard es el home central post-login; /score/dashboard2 queda reservado para Gestion de riesgo
- Aprendizaje operativo: en modo monocompañia con auth bypass, el tenant efectivo debe resolverse desde base y el middleware no debe bloquear navegacion por falta de cookie

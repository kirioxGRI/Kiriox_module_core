# Bitacora de actividad

- Fecha: 2026-05-21 01:45:00
- Tarea: Reemplazar score/dashboard2 por dashboard central inmersivo y mover el dashboard actual a gestion/dashboard_riesgo
- Arquitectura: El launchpad central consume modulos registrados y navegacion filtrada por contratos; el dashboard de riesgo previo se conserva como entrada propia del dominio de riesgo
- Acciones: Se creo EnterpriseLaunchpadPage y builder de tarjetas por contratos, se agrego la ruta gestion/dashboard_riesgo, se marco score/dashboard2 como inmersivo y se normalizo AccessContext con empresa efectiva real

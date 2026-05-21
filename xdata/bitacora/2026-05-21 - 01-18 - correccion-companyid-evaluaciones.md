# Bitacora de actividad

- Fecha: 2026-05-21 01:18:00
- Tarea: Corregir dependencia de company_id en evaluaciones lineales y estructurales
- Hallazgo: La base real tiene una sola empresa (05cb4cc6-c215-4d41-84b3-98c6013cda27) pero DEV_AUTH_TENANT_ID seguia apuntando a 22222222-2222-2222-2222-222222222222
- Acciones: Se creo resolveEffectiveCompanyId y se aplico en repositorios y rutas de evaluacion para resolver la empresa real antes de filtrar o crear runs
- Validacion: TypeScript sigue fallando solo por un error preexistente en src/app/admin/roles/page.tsx

# Implementar capa seguridad security

- `2026-05-30 11:25` Inicio. Objetivo: implementar la capa de seguridad de Kiriox usando exclusivamente `company`, `security_users`, `security_module`, `security_submodule`, `security_roles`, `security_permissions`, `map_user_x_roles`, `map_role_x_module_x_permissions` y `security_logs_access`.
- `2026-05-30 11:27` Contexto cargado: `_KIRIOX.md`, `MEMORY.md`, skill `recordar` y referencia `kiriox-context.md`. La skill de bitácora apunta a `scripts/write_log.py`, pero ese script no existe en este repo; se documenta la actividad manualmente en `xdata/bitacora`.
- `2026-05-30 11:31` Refactor backend: `AuthContext`, `AccessControlTypes`, `AccessContext`, `permissionResolver`, `PrismaAccessContextRepository`, `withAccess` y `withModuleAccess` quedaron alineados al modelo `A/R/W/X` por módulo y empresa.
- `2026-05-30 11:38` Logging crítico implementado en `src/core/permissions/infrastructure/PrismaSecurityAccessLogger.ts` usando `security_logs_access` y el switch `core/access_logs`.
- `2026-05-30 11:43` Rutas protegidas migradas a permisos exactos `A/R/W/X`, incluyendo endpoints de riesgo estructural, lineal, incidentes y plugins.
- `2026-05-30 11:49` APIs administrativas de seguridad migradas a `withAccess` y Prisma vigente: usuarios, roles, asignación de roles, matriz rol/módulo/permisos, compañías y reset de contraseña.
- `2026-05-30 11:56` UI administrativa actualizada: `CatalogRolesPermisosPage` reescrita como matriz `rol × módulo × A/R/W/X`; se agregó `CatalogAccessLoggingPage`; el dashboard de catálogo ahora expone tarjetas para asignación de roles, permisos rol/módulo y logging de accesos.
- `2026-05-30 12:02` Páginas server-side protegidas con `requirePageAccess` en catálogo, roles/permisos, logging de accesos y edición/creación de usuarios.
- `2026-05-30 12:08` Contratos de módulo actualizados para exponer `company` e `incident` en navegación y launchpad conforme al nuevo RBAC por permiso `A`.
- `2026-05-30 12:12` Validación técnica: `npx tsc -p tsconfig.json --noEmit` ejecutado sin errores.
- `2026-05-30 12:17` Normalización de DB real en `interval_db` vía `docker exec kiriox psql`: renombre de códigos legacy en `security_module`, eliminación de `benchmark`, inserción del módulo `incident`, creación del submódulo `core/access_logs` y limpieza de asignaciones ligadas a `benchmark`.
- `2026-05-30 12:20` Verificación DB: `security_module.code` quedó alineado a los 11 módulos oficiales; `security_permissions` mantiene `A/R/W/X`; `core/access_logs` existe y quedó inicialmente en `is_active = false`.
- `2026-05-30 12:23` Cierre adicional: `src/app/admin/layout.tsx` protege todo `/admin` con chequeo server-side de `catalog/R`; páginas de alta y edición de usuario conservan `catalog/W`.
- `2026-05-30 12:24` Validación final: segunda ejecución de `npx tsc -p tsconfig.json --noEmit` sin errores tras el layout server-side.
- `2026-05-30 12:25` Cierre. Resultado: capa de seguridad, administración operativa y proyección de módulos quedaron alineadas al modelo `security_*` con enforcement backend, launchpad por permiso `A`, logging crítico gobernado por switch y catálogo normalizado en la base real.

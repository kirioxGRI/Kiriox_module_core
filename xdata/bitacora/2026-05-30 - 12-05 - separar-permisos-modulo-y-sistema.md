# Separar permisos modulo y sistema

- `2026-05-30 12:05` Inicio. Objetivo: alinear `/modelo/gobernanza/catalogo/roles-permisos`, `/main_dashboard` y `/gestion/dashboard_security` con sus fuentes de verdad reales en `security_module`, `security_system`, `map_role_x_module_x_permissions` y `map_role_x_system_x_permissions`.
- `2026-05-30 12:07` Contexto cargado: `_KIRIOX.md`, `MEMORY.md`, `.env`, skill `recordar`, referencia `kiriox-context.md`, skill `vercel-react-best-practices`, estado del repo y bitácoras previas sobre seguridad.
- `2026-05-30 12:10` Verificación DB: confirmadas tablas `public.security_system`, `public.security_module`, `public.security_roles`, `public.map_role_x_system_x_permissions` y `public.map_role_x_module_x_permissions` en `interval_db`. Se validó que `security_submodule` está vacío.
- `2026-05-30 12:13` Hallazgo de arquitectura: la matriz actual de roles/permisos muestra sistemas pero persiste en `map_role_x_module_x_permissions` por agregación de módulos; además `main_dashboard` todavía construye tarjetas desde módulos/navegación, no desde `security_system`.
- `2026-05-30 12:18` Implementación de base: se extendió `AccessContext` con `companySystems`, `systemAccess` y `enabledSystems`; `PrismaAccessContextRepository` ahora carga acceso directo desde `map_role_x_system_x_permissions`.
- `2026-05-30 12:24` Seguridad HTTP: se agregaron `withSystemAccess` y `requireSystemPageAccess` para proteger superficies gobernadas por `security_system`, manteniendo separado el guard por módulo.
- `2026-05-30 12:31` UI desacoplada: se extrajo `RolePermissionMatrixPage` como componente cliente reutilizable; `CatalogRolesPermisosPage` quedó en modo rol/módulo y `SecuritySystemPermissionsPage` quedó en modo rol/sistema.
- `2026-05-30 12:36` API separada: `/api/admin/rbac/permissions` quedó alineada a `security_module` + `map_role_x_module_x_permissions`; se creó `/api/admin/rbac/system-permissions` alineada a `security_system` + `map_role_x_system_x_permissions`.
- `2026-05-30 12:41` Launchpad: `buildEnterpriseLaunchpadCards` se reconstruyó para usar `security_system`; `main_dashboard` ahora muestra tarjetas según `enabledSystems` y la tarjeta de seguridad queda gobernada por el sistema `security`.
- `2026-05-30 12:45` Documentación operativa: actualizados `_KIRIOX.md` y `MEMORY.md` para registrar la separación estable entre capas de permiso por módulo y por sistema.
- `2026-05-30 12:47` Validación técnica: `npx tsc --noEmit` ejecutado sin errores.
- `2026-05-30 12:48` Cierre. Resultado: catálogo técnico y dashboard de seguridad quedaron separados por fuente de verdad; el launchpad ahora responde a `security_system` y la matriz de módulos ya no agrega sistemas de forma artificial.

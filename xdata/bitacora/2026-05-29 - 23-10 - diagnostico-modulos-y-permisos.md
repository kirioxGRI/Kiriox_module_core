# Diagnóstico módulos y permisos

## 2026-05-29 23:10

**Objetivo**

Levantar inventario real de módulos Kiriox y verificar si la base actual soporta control de acceso por usuario a nivel de módulo.

**Comandos ejecutados**

- Lectura de `_KIRIOX.md`, `MEMORY.md` y skill `recordar`
- Inspección de `src/core/core-bootstrap.ts`, `src/core/permissions/**`, `src/modules/**`
- Consulta a PostgreSQL `interval_db` vía `docker exec kiriox psql`
- Verificación de `public.views_all_objects`, `information_schema.columns` e índices

**Hallazgos**

- Existen `public.users` y `public.users_permission`.
- No existe `public.map_user_x_permission`.
- Sí existen `public.users_roles` y `public.map_users_x_roles`.
- La app tiene infraestructura base de acceso (`withAccess`, `withModuleAccess`, `AccessContextRepository`), pero hoy no aplica autorización real.
- `PrismaAccessContextRepository` retorna todos los módulos y permisos comodín `*`.
- El catálogo `users_permission` no cubre todos los módulos oficiales actuales del runtime.
- Varios módulos publicados en navegación no declaran `nav.permission`, por lo que no pueden filtrarse de forma consistente por permiso.

**Conclusión**

La base para un sistema de acceso por módulo existe solo parcialmente. Falta cerrar el modelo de datos y conectar la autorización real entre DB, navegación y endpoints.

## 2026-05-29 23:38

**Decisión del usuario**

La tabla puente correcta no es usuario-permiso. El modelo aprobado es rol-permiso:

- `users`
- `map_users_x_roles`
- `users_roles`
- `map_role_x_permission`
- `users_permission`

**Implementación ejecutada**

- Se creó la migración `prisma/migrations/20260529_role_permission_bridge/migration.sql`
- Se creó `public.map_role_x_permission`
- Se sembró catálogo base de permisos canónicos por módulo oficial
- Se asignaron esos permisos al rol `super_admin`
- Se actualizó `schema.prisma`
- Se regeneró Prisma Client
- Se conectó la resolución real de permisos desde roles en `PrismaAccessContextRepository`
- Se activó enforcement real en `withAccess`

**Validaciones**

- `public.map_role_x_permission` creada correctamente
- `super_admin` quedó con 60 permisos activos
- `npx tsc -p tsconfig.json --noEmit` ejecutado sin errores

## 2026-05-29 23:58

**Escenario de prueba RBAC**

Se configuraron tres roles de prueba dedicados y se sustituyeron las asignaciones previas de los usuarios objetivo para evitar resultados ambiguos por herencia histórica de roles:

- `deivisadames@gmail.com` -> `qa_rbac_acceso_total`
- `shgcifrado@gmail.com` -> `qa_rbac_sin_simulaciones`
- `haimejonh@gmail.com` -> `qa_rbac_sin_incidentes_monitoreo_reportes_plugins`

**Permisos efectivos verificados**

- `deivisadames@gmail.com`: 60 permisos
- `shgcifrado@gmail.com`: 57 permisos
- `haimejonh@gmail.com`: 50 permisos

**Ajuste adicional para visibilidad**

Se declararon `nav.permission` en los módulos visibles del launchpad para que la navegación responda a RBAC y no solo el backend.

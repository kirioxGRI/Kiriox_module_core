# Bitacora - actualizar-security-roles

- `2026-05-30 08:31` `inicio`
  Objetivo: alinear el codigo con el renombre de `public.users_roles` hacia `public.security_roles`, manteniendo intacta la logica de RBAC.

- `2026-05-30 08:32` `verificacion`
  Se confirmo en DB real que la tabla fisica vigente es `public.security_roles`. Prisma expone el delegado `security_roles` y la relacion `map_users_x_roles.security_roles`.

- `2026-05-30 08:34` `archivo`
  Se actualizaron SQL crudo, delegados Prisma y relaciones generadas en auth/RBAC administrativo para sustituir `users_roles` por `security_roles`.

- `2026-05-30 08:36` `prueba`
  Validacion ejecutada: `npx tsc -p tsconfig.json --noEmit` -> OK.

- `2026-05-30 08:37` `cierre`
  Resultado: backend alineado con el nuevo maestro de roles sin cambiar contratos funcionales de permisos ni asignacion usuario-rol.

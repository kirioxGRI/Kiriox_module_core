# Bitacora - actualizar-security-users

- `2026-05-30 08:22` `inicio`
  Objetivo: actualizar el codigo tras el cambio de `public.users` a `public.security_users` con Prisma ya regenerado por el usuario.

- `2026-05-30 08:23` `contexto`
  Lectura aplicada: `_KIRIOX.md`, skill `recordar`, contexto base de Kiriox y `MEMORY.md`.

- `2026-05-30 08:24` `verificacion`
  Se confirmo que el cambio afecta tres capas: SQL crudo con `public.users`, delegados `prisma.users`/`tx.users` y la relacion Prisma de `map_users_x_roles` hacia `security_users`.

- `2026-05-30 08:27` `archivo`
  Archivos ajustados en auth, permisos, APIs administrativas, rutas de gobierno y repositorios modulares para reemplazar referencias antiguas por `security_users`.

- `2026-05-30 08:29` `decision`
  Se mantuvo el alcance acotado al renombre del maestro de usuarios. No se altero logica funcional ni contrato de RBAC; solo la integracion con Prisma/PostgreSQL.

- `2026-05-30 08:30` `prueba`
  Validacion ejecutada: `npx tsc -p tsconfig.json --noEmit` -> OK.

- `2026-05-30 08:31` `cierre`
  Resultado: codigo alineado con `public.security_users` en las rutas y repositorios que seguian apuntando a `users`. Se registro el aprendizaje en `MEMORY.md`.

# Bitacora - remover-users-permission

- `2026-05-30 08:48` `inicio`
  Objetivo: remover la tabla `public.users_permission` de la base de datos real por solicitud explicita del usuario.

- `2026-05-30 08:49` `verificacion`
  Se confirmo que la tabla existia y que ya no tenia tablas hijas apuntandole.

- `2026-05-30 08:50` `resultado`
  Se ejecuto `DROP TABLE public.users_permission;` en `interval_db`.

- `2026-05-30 08:51` `impacto`
  El backend actual sigue referenciando `users_permission` en Prisma, en la API administrativa de permisos y en la resolucion de permisos RBAC. Esas partes quedan expuestas a error runtime hasta adaptar el codigo y el schema.

- `2026-05-30 08:52` `cierre`
  Verificacion posterior: la tabla ya no existe en `public.views_all_objects`.

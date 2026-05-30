# Bitacora - remover-map-users-x-roles

- `2026-05-30 08:38` `inicio`
  Objetivo: remover la tabla `public.map_users_x_roles` de la base de datos real por solicitud explicita del usuario.

- `2026-05-30 08:39` `verificacion`
  Se confirmo que la tabla existia y que no tenia otras tablas hijas apuntandole; solo FKs salientes hacia `security_users` y `security_roles`.

- `2026-05-30 08:40` `resultado`
  Se ejecuto `DROP TABLE public.map_users_x_roles;` en `interval_db`.

- `2026-05-30 08:41` `impacto`
  El backend actual sigue referenciando `map_users_x_roles` en Prisma, RBAC administrativo y resolucion de permisos. La tabla ya no existe, por lo que esas rutas quedan expuestas a error runtime hasta adaptar el codigo y el schema.

- `2026-05-30 08:42` `cierre`
  Verificacion posterior: la tabla ya no existe en `public.views_all_objects`.

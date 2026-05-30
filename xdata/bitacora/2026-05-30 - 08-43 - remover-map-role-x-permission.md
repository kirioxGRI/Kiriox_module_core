# Bitacora - remover-map-role-x-permission

- `2026-05-30 08:43` `inicio`
  Objetivo: remover la tabla `public.map_role_x_permission` de la base de datos real por solicitud explicita del usuario.

- `2026-05-30 08:44` `verificacion`
  Se confirmo que la tabla existia y solo tenia FKs salientes hacia `security_roles` y `users_permission`.

- `2026-05-30 08:45` `resultado`
  Se ejecuto `DROP TABLE public.map_role_x_permission;` en `interval_db`.

- `2026-05-30 08:46` `impacto`
  El backend actual sigue referenciando `map_role_x_permission` en Prisma y en la API administrativa de permisos por rol. La resolucion de permisos por RBAC tambien la consulta, por lo que esas rutas quedan expuestas a error runtime hasta adaptar el codigo y el schema.

- `2026-05-30 08:47` `cierre`
  Verificacion posterior: la tabla ya no existe en `public.views_all_objects`.

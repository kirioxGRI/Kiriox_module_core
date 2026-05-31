# Corrección de visualización y asignación de todos los sistemas en panel de seguridad

- `2026-05-30 23:25` Inicio del fix. Objetivo: Mostrar los 11 sistemas y permitir el guardado de sus permisos.
- `2026-05-30 23:28` Redistribución en DB: Se mapearon los 8 módulos legacy a sus sistemas correctos correspondientes y se crearon 2 nuevos módulos (`academy` y `seguridad`) para los sistemas que quedaban con 0 módulos.
- `2026-05-30 23:30` Mapeo de aplicación: Modificado `securityModuleMap.ts` para mapear el nuevo módulo `academy` al módulo de aplicación `hechos-relevantes` (decoupling de `eventos`), y mapear el módulo `seguridad` a `[]`.
- `2026-05-30 23:32` Modificación de API: Modificado `/api/admin/rbac/permissions` removiendo el `INNER JOIN` restrictivo para devolver la totalidad de sistemas activos registrados.
- `2026-05-30 23:35` Validación estática de TypeScript: `npx tsc --noEmit` completado exitosamente con 0 errores.
- `2026-05-30 23:38` Cierre: Se registraron aprendizajes en `MEMORY.md`.

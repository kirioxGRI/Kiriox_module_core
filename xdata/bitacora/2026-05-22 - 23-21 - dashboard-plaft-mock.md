## 2026-05-22 23:21

**Objetivo:** habilitar el acceso desde `/main_dashboard` al módulo PLAFT y montar un dashboard mock en `/gestion/dashboard_plaft` sin alterar contratos productivos ni APIs.

**Decisiones:**
- Se mantuvo `src/app/**` como capa delgada de exposición.
- La UI real se implementó dentro de `src/modules/catalog/ui/**` para respetar el boundary del módulo `catalog`.
- El dashboard se dejó completamente mockeado, sin consultas ni escrituras a base de datos.

**Archivos cambiados:**
- `src/modules/core/application/builders/buildEnterpriseLaunchpadCards.ts`
- `src/app/gestion/dashboard_plaft/page.tsx`
- `src/modules/catalog/ui/pages/PlaftDashboardPage.tsx`
- `src/modules/catalog/ui/pages/PlaftDashboardPage.module.css`
- `src/modules/catalog/ui/pages/plaftDashboard.mock.ts`
- `src/modules/catalog/ui/components/plaft-dashboard/*`
- `src/modules/catalog/ui/pages/index.ts`

**Validación:**
- `npx tsc --noEmit`
- Resultado: falla por error preexistente en `src/app/admin/roles/page.tsx` (`RoleRecord | null` no asignable a `Record<string, unknown> | null`).

**Resultado:** el card PLAFT del launchpad ahora navega a `/gestion/dashboard_plaft` y muestra un dashboard mock visualmente integrado al shell actual.

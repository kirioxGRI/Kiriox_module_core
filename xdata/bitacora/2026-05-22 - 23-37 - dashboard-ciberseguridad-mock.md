## 2026-05-22 23:37

**Objetivo:** habilitar el acceso desde `/main_dashboard` al módulo Ciberseguridad y montar un dashboard mock en `/gestion/dashboard_ciberseguridad` sin tocar datos ni contratos productivos.

**Decisiones:**
- Se mantuvo `src/app/**` como capa delgada de exposición.
- La UI real se implementó dentro de `src/modules/simulation/ui/**`.
- El dashboard quedó completamente mockeado, sin dependencias de API ni base de datos.

**Archivos cambiados:**
- `src/modules/core/application/builders/buildEnterpriseLaunchpadCards.ts`
- `src/app/gestion/dashboard_ciberseguridad/page.tsx`
- `src/modules/simulation/ui/pages/CibersecurityDashboardPage.tsx`
- `src/modules/simulation/ui/pages/CibersecurityDashboardPage.module.css`
- `src/modules/simulation/ui/pages/ciberDashboard.mock.ts`
- `src/modules/simulation/ui/components/ciber-dashboard/*`

**Validación:**
- `git diff --check`
- Resultado: sin errores de formato.

**Resultado:** la tarjeta Ciberseguridad del launchpad navega a `/gestion/dashboard_ciberseguridad` y muestra un dashboard mock integrado al shell actual.

## 2026-05-22 23:31

**Objetivo:** habilitar el acceso desde `/main_dashboard` al módulo Gobierno de IA y montar un dashboard mock en `/gestion/dashboard_gob_ia` sin tocar datos ni contratos productivos.

**Decisiones:**
- Se mantuvo `src/app/**` como capa delgada de exposición.
- La UI real se implementó dentro de `src/modules/linear-risk/ui/**`.
- El dashboard quedó completamente mockeado, sin dependencias de API ni base de datos.

**Archivos cambiados:**
- `src/modules/core/application/builders/buildEnterpriseLaunchpadCards.ts`
- `src/app/gestion/dashboard_gob_ia/page.tsx`
- `src/modules/linear-risk/ui/pages/GobIaDashboardPage.tsx`
- `src/modules/linear-risk/ui/pages/GobIaDashboardPage.module.css`
- `src/modules/linear-risk/ui/pages/gobIaDashboard.mock.ts`
- `src/modules/linear-risk/ui/components/gob-ia-dashboard/*`

**Validación:**
- `git diff --check`
- Resultado: sin errores de formato.

**Resultado:** la tarjeta Gobierno de IA del launchpad navega a `/gestion/dashboard_gob_ia` y muestra un dashboard mock integrado al shell actual.

## 2026-05-22 23:41

**Objetivo:** habilitar el acceso desde `/main_dashboard` al módulo Continuidad de negocios y montar un dashboard dedicado en `/gestion/dashboard_continuidad_negocios`, incluyendo botón de cierre hacia el dashboard principal.

**Decisiones:**
- Se mantuvo `src/app/**` como capa delgada de exposición.
- La UI real se implementó dentro de `src/modules/monitoring/ui/**`.
- La interfaz evita la palabra "mock" por instrucción explícita del usuario.
- Se reutilizó `GovernanceCloseButton` con retorno a `/main_dashboard`.

**Archivos cambiados:**
- `src/modules/core/application/builders/buildEnterpriseLaunchpadCards.ts`
- `src/app/gestion/dashboard_continuidad_negocios/page.tsx`
- `src/modules/monitoring/ui/pages/ContinuidadDashboardPage.tsx`
- `src/modules/monitoring/ui/pages/ContinuidadDashboardPage.module.css`
- `src/modules/monitoring/ui/pages/continuidadDashboard.data.ts`
- `src/modules/monitoring/ui/components/continuidad-dashboard/*`

**Validación:**
- `git diff --check`
- Resultado: sin errores de formato.

**Resultado:** la tarjeta Continuidad de negocios del launchpad navega a `/gestion/dashboard_continuidad_negocios` y muestra una pantalla dedicada con cierre visible al dashboard principal.

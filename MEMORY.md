

# Arquitectura de desarrollo de Kiriox
Explicación para un Experto (Orquestación, Desacoplamiento y Arquitectura Evolutiva)

Para un arquitecto, Kiriox v3 es una implementación de Vertical Slicing con un Runtime Orchestrator que gestiona el ciclo de vida y la composición del sistema en tiempo de ejecución.

1.  Sustitución de Liskov a Nivel de Módulo: La arquitectura se basa en la abstracción total de la funcionalidad. Mediante el `KirioxModuleContract`, el sistema interactúa con los módulos como cajas negras. Esto permite que el Core actúe como un Hipervisor de Módulos, orquestando la ejecución sin conocer jamás los detalles de implementación internos (Domain o Infrastructure).
2.  Orquestación Basada en Metadatos (Declarative Discovery): Hemos pasado de "Configuración como Código" a "Descubrimiento como Servicio". El Registry no es solo un mapa; es el punto de entrada para una Composición Dinámica. Los hooks de `activate` y `deactivate` permiten que los módulos gestionen su propio setup (como la inicialización de micro-caches o la suscripción a eventos en el Event Bus) de manera asíncrona y aislada.
3.  Aislamiento de Capas de Persistencia y SQL Leakage: A diferencia de las arquitecturas monolíticas tradicionales donde el ORM es un "acoplador universal", aquí el acceso a datos está estrictamente encapsulado en el Infrastructure Layer de cada módulo. El uso de `Prisma.sql` (Raw SQL) dentro de repositorios modulares permite optimizar el rendimiento (especialmente en agregaciones complejas para dashboards) sin que las reglas de SQL o esquemas específicos "sangren" hacia las capas superiores o hacia otros módulos.
4.  Capa de Composición en Tiempo de Ejecución (Context-Aware UI): El `AccessContextRepository` junto con `buildNavigation` funcionan como una capa de Feature Toggling Multi-Tenant. La interfaz de usuario no es estática; se "deriva" del estado del Registry y del contexto de acceso del usuario. Esto permite una arquitectura multi-inquilino donde la funcionalidad puede variar drásticamente entre empresas simplemente activando o desactivando registros en el manifest, sin despliegues adicionales.
5.  Agnosticismo de la Capa de Entrega (Delivery Agnostic): Al separar los `handlers` y las `pages` de las rutas de Next.js, hemos creado una arquitectura lista para Micro-Frontends. Podríamos migrar a Module Federation o cambiar el framework de rutas por completo, y el 100% de la lógica de negocio y dominio permanecería intacta, ya que el framework (Next.js) es tratado simplemente como un detalle de implementación de la capa de entrega.

Conclusión: Kiriox v3 es una arquitectura evolutiva que combina la simplicidad de desarrollo de un monolito con la flexibilidad y el aislamiento de los microservicios. Es un sistema de Autogestión de Capacidades donde el Core proporciona los servicios de bajo nivel (seguridad, persistencia, auditoría) y los módulos proporcionan la inteligencia de negocio de manera autónoma y autocontenida.




Tablas para la parte estructura. Si notas que alguna ha cambiado actualizar.

| Tabla                                         | Descripción 
─────────────────────────────────────────────────────────────────────
| `public.graph_run_sa`                         | Tabla maestra de evaluaciones estructurales o corridas de análisis por grafo.                 |
| `public.graph_catalog_run_lifecycle`          | Catálogo de estados del ciclo de vida del run estructural.                                    |
| `public.graph_catalog_run_scope_type`         | Catálogo del alcance del análisis estructural: compañía, elemento, actividad o personalizado.  |
| `public.graph_catalog_run_methodology`        | Catálogo de metodologías de análisis estructural por grafo.                                      |
| `public.graph_run_lifecycle_history`          | Histórico auditable de cambios de estado del run estructural.                                    |
| `public.graph_activities_dependencies`        | Registro de dependencias estructurales de cada actividad.                                      |
| `public.graph_activities_dependency_resource` | Catálogo de tipos de recurso del que puede depender una actividad.                         |
| `public.graph_activities_failure_effect`      | Catálogo del efecto producido si falla una dependencia.                                    |
| `public.graph_activities_dependency_strength` | Catálogo de fuerza de dependencia: baja, media, alta o crítica.                                 |
| `public.graph_activities_alternative_level`   | Catálogo de nivel de alternativa disponible ante falla de dependencia.                           |
| `public.graph_run_sa_activities`              | Tabla puente entre evaluaciones estructurales y actividades incluidas en el análisis.           |


## 2026-05-05 — Aprendizaje

**Regla aprendida:** Registrar en `MEMORY.md` únicamente aprendizajes de alta importancia y reutilización futura; no registrar ajustes tácticos puntuales sin valor general.

**Aplicación futura:** Filtrar cada posible entrada por impacto sistémico y reusabilidad antes de guardarla en memoria.

En general:
Todo aprendizaje que reduzca incertidumbre futura, evite repetir errores, preserve decisiones del proyecto o mejore la consistencia técnica debe registrarse en MEMORY.md. No registres observaciones triviales, temporales o demasiado específicas. Prioriza conocimiento estable, reutilizable y relevante para arquitectura, desarrollo, pruebas, despliegue, seguridad, mantenimiento y evolución del sistema.
## 2026-05-05 — Aprendizaje

**Contexto:** Conexión a la base de datos del proyecto.

**Regla aprendida:** La base de datos real es `interval_db`. El contenedor Docker se llama `kiriox`. Antes de consultar la DB, leer siempre `.env`. El comando correcto es `docker exec kiriox psql -U postgres -d interval_db -c "..."`. Nunca asumir `kiriox_db` ni `trace-postgres`.

**Aplicación futura:** Siempre leer `.env` antes de cualquier consulta o suposición sobre estructura de tablas. Validar contra `interval_db`, no contra otras bases.

## 2026-05-05 — Aprendizaje

**Contexto:** Normalización del campo "Objetivo afectado" en el paso 2 de riesgo lineal.

**Regla aprendida:** "Objetivo afectado" no debe capturarse como texto libre; debe seleccionarse desde `public.company_objective` y persistirse como `objective_id` (UUID) con FK.

**Aplicación futura:** En formularios de riesgo, usar catálogos maestros corporativos para entidades de gobierno (objetivos, apetito, etc.) y evitar texto libre cuando el dato define trazabilidad y reporting.
## 2026-05-05 — Aprendizaje

**Contexto:** Modernización del wizard de captura estructural.

**Regla aprendida:** La evaluación de impacto operativo y criticidad de actividades debe realizarse de forma dual y separada, basada en catálogos técnicos específicos (`graph_activity_catalog_impact` y `graph_activity_catalog_criticality`) en lugar de formularios de texto libre.

**Aplicación futura:** Al diseñar interfaces de valoración de riesgo estructural, priorizar el uso de listboxes enriquecidos con "Definiciones Operativas" y "Señales de Decisión" que guíen al usuario, separando la configuración administrativa (Step 1) de la valoración técnica (Step 2/3).
## 2026-05-05 — Aprendizaje

**Contexto:** Diseño del paso 2 en `/gestion/wizard_captura_estructural` para captura de dependencias.

**Regla aprendida:** La actividad X no se captura manualmente en el formulario del paso 2; X debe venir arrastrada desde la selección del paso 1 (actividades incluidas en la corrida).

**Aplicación futura:** En flujos estructurales X→Y, bloquear captura libre de X y usar únicamente actividades preseleccionadas de la corrida para asegurar trazabilidad y consistencia.
## 2026-05-05 — Aprendizaje

**Contexto:** Implementación de la ruta `/gobierno/actividades-clave/nuevo` para la creación de actividades.

**Regla aprendida:** La creación de actividades clave de gobierno requiere vincularlas obligatoriamente a una empresa (`company_id`) y a un proceso/elemento (`element_id`). La interfaz debe permitir la selección dinámica de procesos basada en la empresa elegida.

**Aplicación futura:** Para nuevas pantallas de creación de objetos en el dominio de gobierno, seguir el patrón de `GovernanceActivityNewPage`: fetch de contexto (empresas) -> fetch de dependencia (procesos) -> POST a API de actividades.

## 2026-05-07 — Aprendizaje

**Contexto:** Inserción manual de incidentes en `public.incident_register`.

**Regla aprendida:** La tabla `incident_register` requiere UUIDs reales para `element_id`, `risk_id`, `control_id`, `severity_id` y `action_plan_id`. `severity_id` apunta a `catalog_activity_criticality_level` (Muy bajo, Bajo, Medio, Alto, Crítico) y `action_plan_id` apunta a `catalog_ra_valoration` (Aceptar, Tratar, Escalar, etc.).

**Aplicación futura:** Al realizar inserciones de prueba o migraciones de datos, siempre mapear los campos FK a los catálogos correspondientes verificando los IDs en `interval_db` del contenedor `kiriox`.

**UI Renaming:** El módulo "Hechos Relevantes" fue renombrado a "Incidentes" en el sidebar y dashboards. Se debe mantener el endpoint `/api/hechos-relevantes/buscar` por compatibilidad, pero la etiqueta visible al usuario siempre debe ser "Incidentes".

## 2026-05-08 — Aprendizaje

**Contexto:** Corrección del usuario sobre estado del entorno raíz en D:\_KIRIOX_GRI_v3.

**Regla aprendida:** No asumir dependencias faltantes en raíz; el usuario ya instaló paquetes y confirmó que el sistema corre, Prisma generate y TypeScript check ejecutados con éxito.

**Aplicación futura:** Al resumir avances, reflejar explícitamente que la raíz operativa D:\_KIRIOX_GRI_v3 está provisionada y funcional, evitando reportar bloqueos de instalación ya resueltos.


## Version de prisma
prisma               : 7.8.0
@prisma/client       : 7.8.0
Operating System     : win32
Architecture         : x64
Node.js              : v22.19.0
TypeScript           : 5.9.3
Query Compiler       : enabled
PSL                  : @prisma/prisma-schema-wasm 7.8.0-6.3c6e192761c0362d496ed980de936e2f3cebcd3a
Schema Engine        : schema-engine-cli 3c6e192761c0362d496ed980de936e2f3cebcd3a (at node_modules\.pnpm\@prisma+engines@7.8.0\node_modules\@prisma\engines\schema-engine-windows.exe)
Default Engines Hash : 3c6e192761c0362d496ed980de936e2f3cebcd3a
Studio               : 0.27.3

## 2026-05-13 — Aprendizaje

**Contexto:** Implementación del módulo administrativo `plugins` y preparación del sistema para instalación de extensiones empaquetadas.

**Regla aprendida 1:** En Kiriox, registrar un módulo en `core-bootstrap` y en el `module-registry` no basta para que aparezca en el menú. Para que una entrada de navegación sea visible, el módulo debe existir también en `ModuleCode`, en la lista efectiva de `enabledModules` del `AccessContextRepository`, y su icono debe estar resuelto en el `Sidebar`.

**Aplicación futura 1:** Cada vez que se agregue un módulo oficial nuevo, validar de forma explícita este pipeline de exposición: `module.contract` -> `core-bootstrap` -> `enabledModules` -> `buildNavigation` -> `Sidebar icon map`. Si falta uno, el módulo queda “registrado” pero no visible.

**Regla aprendida 2:** Un sistema de plugins por contrato no debe instalar paquetes directamente en runtime sin cuarentena. El flujo correcto y reusable es: recibir `.zip` -> guardar paquete -> descomprimir en `quarantine/` -> validar `plugin.manifest.json` -> validar permisos, versión semver, dependencias y `extensionPoints` -> mover a `plugins/installed/` -> cargar `index.ts` sólo si el contrato exportado coincide con el manifiesto y cumple el `KirioxPluginContract`.

**Aplicación futura 2:** Toda futura capacidad de extensibilidad debe usar staging en disco (`packages/`, `quarantine/`, `installed/`) y validación contractual previa a la activación. No mezclar “subida de archivo”, “instalación” y “activación” en un solo paso opaco.

## 2026-05-21 — Aprendizaje

**Contexto:** Pantallas de riesgo lineal y estructural rotas por dependencia del tenant/company_id entregado por auth bypass en un sistema monocompañía.

**Regla aprendida:** En Kiriox, las evaluaciones de riesgo lineal y estructural no deben depender ciegamente del companyId recibido desde auth cuando el sistema opera con una sola empresa. Deben resolver la empresa efectiva real desde public.company antes de filtrar o crear runs.

**Aplicación futura:** Para módulos de evaluación monocompañía, normalizar el contexto de empresa en infraestructura/API antes de consultas o inserciones para evitar quiebres por envs de bypass o tenants desalineados.


## 2026-05-21 — Aprendizaje

**Contexto:** Correccion de rutas principales del sistema tras separar el dashboard central del dashboard de gestion de riesgo.

**Regla aprendida:** El dashboard central post-login de Kiriox Enterprise vive en /main_dashboard. La ruta /score/dashboard2 queda reservada como dashboard del modulo de gestion de riesgo.

**Aplicación futura:** Login, home, topbar y modulos core deben apuntar a /main_dashboard como entrada principal; cierres y accesos del dominio de riesgo pueden seguir usando /score/dashboard2 como dashboard especializado.

## 2026-05-21 — Aprendizaje

**Contexto:** Navegacion interna en desarrollo con `DEV_AUTH_BYPASS=1`.

**Regla aprendida:** Cuando el entorno usa bypass de autenticacion, el `middleware` no debe forzar redireccion a `/login`, porque puede romper accesos internos validos durante construccion y pruebas del sistema.

**Aplicación futura:** Si el entorno de desarrollo opera con auth bypass, permitir paso por `middleware` y delegar el contexto de acceso a la capa de auth/aplicacion en lugar de bloquear por ausencia de cookie JWT.

## 2026-05-22 — Aprendizaje

**Contexto:** Definición canónica de los módulos del launchpad en `/main_dashboard`.

**Regla aprendida:** El launchpad de Kiriox GRI expone 10 módulos. Cada `KirioxOfficialModuleId` tiene un título y propósito funcional fijo que no debe cambiarse sin autorización explícita. El mapeo vigente es:

| moduleId | Título en UI | Propósito |
|---|---|---|
| `structural-risk` | Gestión de riesgo | Matrices impacto/probabilidad y análisis estructural por grafos |
| `company` | Gobierno de Auditoría | Auditorías, hallazgos, evidencias, recomendaciones y seguimiento |
| `incident` | Análisis preventivo | Señales tempranas, tendencias y escenarios de deterioro pre-incidente |
| `catalog` | PLAFT | Lavado de activos, debida diligencia, alertas y monitoreo transaccional |
| `linear-risk` | Gobierno de IA | Modelos, sesgos, trazabilidad algorítmica y uso responsable de IA |
| `simulation` | Ciberseguridad | Amenazas, vulnerabilidades, madurez y exposición tecnológica |
| `monitoring` | Continuidad de negocios | BIA, planes de continuidad, recuperación y resiliencia operativa |
| `hechos-relevantes` | Kiriox Academy | Formación, certificación y transferencia de conocimiento |
| `reportes` | Kiriox Risk Average | Índice agregado de exposición al riesgo de la organización |
| `plugins` | Kiriox Enterprise Marketplace | Módulos, plugins, plantillas y extensiones empresariales |

**Aplicación futura:** Al agregar, renombrar o redescribir tarjetas del launchpad, actualizar simultáneamente `buildEnterpriseLaunchpadCards.ts`, `_KIRIOX.md` y esta entrada de memoria. La descripción funcional de cada módulo es la fuente de verdad para mensajes, tooltips y documentación.

## 2026-05-22 — Aprendizaje

**Contexto:** Unificación visual del shell Kiriox — eliminación de las 3 capas de colores al montar módulos.

**Causa raíz identificada:** Cada módulo declaraba su propio fondo en CSS (`.page`, `.dashboard`, `outer div`), lo que generaba 3 bandas de color visibles: sidebar/topbar + main-content + el fondo del componente de página.

**Regla aprendida — paleta canónica:**
| Elemento | Color |
|----------|-------|
| Sidebar | `#1e3d7a` (sólido, sin blur) |
| Topbar | `#1e3d7a` (sólido, `borderBottom: none`) |
| `<main>` via AppShell | `#182f62` (desde `manifest.backgroundColor`) |
| Contenedor raíz de página | `background: transparent; min-height: 100%` |
| Cards / paneles | `background: rgba(0,0,0,0.18)` |
| Overlays / drawers / modales | Mantienen su propio fondo opaco oscuro |

**Regla aprendida — contract de módulo:**
- Todo módulo debe declarar `family` (`platform` | `risk` | `marketplace`) y `backgroundColor: "#182f62"`.
- Si el módulo **no debe aparecer en el menú lateral**, omitir el campo `nav` completamente.
- El módulo `incident` tiene `family: "platform"` y **sin `nav`** — no es un módulo de riesgo y no publica menú.

**Pipeline de color:** `manifest.backgroundColor` → `NavItem.backgroundColor` (via `buildNavigation.ts`) → `AppShell` resuelve módulo activo por pathname → aplica `background` inline a `<main>`. Fallback: `#182f62`.

**Aplicación futura:** Al agregar un módulo nuevo o corregir colores, nunca poner fondo en el contenedor raíz de la página. El fondo de pantalla completa es responsabilidad exclusiva del contrato del módulo + AppShell.


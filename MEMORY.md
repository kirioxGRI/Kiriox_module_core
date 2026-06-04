

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

## 2026-05-23 — Aprendizaje

**Contexto:** Eliminación de evaluaciones `run_ra` bloqueada por incidentes registrados en `/validacion/eventos?tab=hechos-relevantes`.

**Regla aprendida:** `public.incident_register` no debe mantener FKs duras hacia `run_ra_controls` ni `run_ra_risks`. Los incidentes son evidencia operacional auditable y deben sobrevivir al ciclo de vida de evaluaciones lineales; cualquier referencia a riesgo/control de una corrida debe tratarse como referencia informativa o snapshot, no como dependencia de borrado.

**Aplicación futura:** Al modelar incidentes, hallazgos, evidencias o eventos persistentes, no acoplarlos físicamente a artefactos efímeros de una evaluación (`run_*`). Usar entidades maestras estables o referencias desacopladas para preservar trazabilidad histórica y evitar bloqueos de cascada.

## 2026-05-24 — Aprendizaje

**Contexto:** Sincronización de Nombre Comercial con Razón Social (`legal_name`).

**Regla aprendida:** En el formulario de Empresa (`CompanyEditorPage.tsx`), el campo "Nombre Comercial" (`name`) debe actualizar simultáneamente el campo `legal_name` al momento de enviar el payload a la API, garantizando consistencia en `public.company`.

**Aplicación futura:** Para interfaces que soliciten un nombre principal pero la base de datos requiera otros campos obligatorios derivados, mapearlos automáticamente en el cliente o API usando el valor provisto, salvo que existan campos separados explícitos.


## 2026-05-24 — Aprendizaje

**Contexto:** Error al cargar la página de apetito de riesgo (`/modelo/gobernanza/catalogo/apetito`) sobre `catalog_appetite`.

**Regla aprendida:** El campo `is_active` en PostgreSQL puede existir como boolean mientras `schema.prisma` queda desactualizado tipándolo como `String`. Ese desajuste provoca errores internos de serialización de Prisma en `findMany`. Al corregir el esquema a `Boolean`, el repositorio de persistencia debe mapear ese boolean al tipo string (`ACTIVE`/`INACTIVE`) que espera la capa de dominio/UI.

**Aplicación futura:** Si una tabla existe pero no carga datos, verificar primero desajustes de tipos entre la base real y `schema.prisma`. Tras corregirlos, ejecutar `npx prisma generate` y ajustar el mapeo del repository correspondiente.


## 2026-05-25 - Aprendizaje

**Contexto:** Personalizacion visual de pasos en el wizard de riesgo lineal.

**Regla aprendida:** El paso 2 del wizard de riesgo lineal (StepAnalisisRiesgo.tsx) requiere mostrar contextualizada la actividad seleccionada en el paso 1. En lugar de texto descriptivo plano, se utiliza un badge enriquecido con degradados (linear-gradient) y bordes semitransparentes en consonancia con la estetica premium de Kiriox (glassmorphism/fondos oscuros).

**Aplicacion futura:** En Wizards de varios pasos, arrastrar metadata (como nombres de entidades del paso previo) y mostrarlos como badges estilizados en la cabecera de las tarjetas para guiar visualmente el flujo de captura sin saturar de texto.

## 2026-05-25 - Aprendizaje

**Contexto:** Discrepancia del riesgo residual lineal entre formulas del backend y frontend.

**Regla aprendida:** El score de riesgo residual lineal debe ser homogeneo. La formula canonica es la aditiva (residual = max(0, inherent - totalReduction)). Las rutas de guardado (API) deben usar esta formula al persistir residual_risk_score, en lugar del producto de impactos/probabilidades redondeados. Asimismo, el heatmap del paso 4 requiere mapear explicitamente en el repositorio de valoracion los campos de posicion residual_impact_pos, residual_probability_pos e identifiers del owner desde la DB y el rationale JSON.

**Aplicacion futura:** Al modificar calculos de riesgos lineales, contrastar siempre el controlador de API, la UI del paso de control/valoracion y el fallback del repositorio. Todos deben resolver de forma determinista la formula aditiva.

## 2026-05-29 - Aprendizaje

**Contexto:** Definicion del modelo de autorizacion para acceso a modulos por usuario en Kiriox.

**Regla aprendida:** El control de permisos no debe modelarse con una tabla puente usuario-permiso. La estructura correcta es `users -> map_users_x_roles -> users_roles -> map_role_x_permission -> users_permission`. En Kiriox, los roles representan puestos internos de la empresa y los permisos se asignan al rol, no directamente al usuario.

**Aplicacion futura:** Toda expansion del RBAC debe preservar el patron rol-permiso como fuente de verdad para navegacion, autorizacion backend y administracion de acceso por modulo.

## 2026-05-29 - Aprendizaje

**Contexto:** Prueba visual de acceso por modulo basada en `AccessContext` y launchpad de Kiriox.

**Regla aprendida:** Para que el RBAC se refleje en la navegacion y en las tarjetas del launchpad, cada modulo visible debe declarar `manifest.nav.permission`. Si el modulo no declara ese permiso, puede seguir visible aunque el backend ya restrinja sus endpoints.

**Aplicacion futura:** Al agregar o ajustar permisos por modulo, sincronizar siempre la capa de autorizacion backend con `nav.permission` en los manifests de los modulos visibles.

## 2026-05-30 - Aprendizaje

**Contexto:** Renombre del maestro de usuarios desde `public.users` a `public.security_users` con Prisma ya regenerado.

**Regla aprendida:** En Kiriox, la entidad canonica de autenticacion y membresia ahora es `security_users`. Cuando Prisma se alinea con ese cambio, no basta con actualizar el schema: tambien deben migrarse todos los `prisma.users`/`tx.users`, el SQL crudo `public.users` y las relaciones derivadas como `map_users_x_roles.users`, que pasan a `security_users`.

**Aplicacion futura:** Ante renombres de tablas o modelos base, validar siempre tres capas en la misma intervencion: delegado Prisma, SQL crudo y nombres de relaciones generadas por Prisma en rutas administrativas, auth y repositorios.

## 2026-05-30 - Aprendizaje

**Contexto:** Renombre del maestro de roles desde `public.users_roles` a `public.security_roles` con Prisma ya regenerado.

**Regla aprendida:** En Kiriox, el catalogo canonico de roles internos ahora vive en `security_roles`. Cuando se regenera Prisma tras este cambio, deben migrarse simultaneamente el SQL crudo `public.users_roles`, los delegados `prisma.users_roles`/`tx.users_roles` y las relaciones derivadas como `map_users_x_roles.users_roles`, que pasan a `security_roles`.

**Aplicacion futura:** En cambios de naming del modelo RBAC, validar siempre en conjunto usuario, rol y tablas puente para mantener consistente el eje `security_users -> map_users_x_roles -> security_roles -> map_role_x_permission`.


## Capa de seguridad
public.company
Define la empresa propietaria de usuarios, roles y módulos.
public.security_users
Usuarios del sistema Kiriox. Es la tabla oficial de usuarios para seguridad.
public.security_module
Catálogo de módulos principales disponibles por empresa.
public.security_submodule
Catálogo de submódulos asociados a cada módulo principal.
public.security_roles
Roles de seguridad pertenecientes a una empresa.
public.security_permissions
Catálogo maestro de permisos independientes: A, R, W, X.
public.map_user_x_roles
Tabla puente que asigna roles a usuarios.
public.map_role_x_module_x_permissions
Tabla puente que define qué permisos tiene cada rol sobre cada módulo.
public.security_logs_access
Bitácora de accesos a recursos, módulos, submódulos y acciones realizadas o denegadas.

## 2026-05-30 — Aprendizaje

**Contexto:** Rediseño integral de la capa de seguridad para abandonar el RBAC legacy y operar únicamente con tablas `security_*`.

**Regla aprendida:** La seguridad canónica de Kiriox se resuelve exclusivamente con `security_users -> map_user_x_roles -> security_roles -> map_role_x_module_x_permissions -> security_permissions`, usando permisos independientes `A`, `R`, `W` y `X`. Google solo autentica identidad; el correo debe existir previamente en `security_users` y el backend debe validar acceso por empresa, módulo activo y permiso exacto antes de servir datos o ejecutar acciones.

**Aplicación futura:** Toda nueva ruta, página, navegación o administración de acceso debe consumir `security_module`, `security_submodule`, `security_roles`, `security_permissions` y `security_logs_access` como única fuente de verdad. No reintroducir `public.users`, `users_roles`, `users_permission`, `map_users_x_roles` ni `map_role_x_permission`.

## 2026-05-30 — Aprendizaje

**Contexto:** Alineación de licenciamiento y visibilidad de módulos con el runtime oficial de Kiriox.

**Regla aprendida:** `security_module.code` debe coincidir exactamente con los `moduleId` oficiales del runtime (`core`, `catalog`, `company`, `incident`, `linear-risk`, `structural-risk`, `simulation`, `monitoring`, `hechos-relevantes`, `reportes`, `plugins`) sin capa de alias. El launchpad y la navegación deben reflejar la intersección entre módulos activos por empresa, módulos registrados en el registry y módulos donde el usuario tiene permiso `A`.

**Aplicación futura:** Ante cualquier alta o renombre de módulo, sincronizar inmediatamente contrato de módulo, `security_module.code`, `AccessContext` y navegación. El registro `benchmark` queda retirado y no debe reutilizarse.

## 2026-05-30 — Aprendizaje

**Contexto:** Instrumentación de auditoría crítica de accesos del nuevo RBAC.

**Regla aprendida:** El switch global del logging de accesos vive como submódulo `core/access_logs` en `security_submodule` usando `is_active`. Cuando está activo, solo se registran intentos `denied`, errores de resolución/autorización y acciones `X` permitidas en `security_logs_access`; lecturas y escrituras exitosas comunes no se registran en modo normal.

**Aplicación futura:** Cualquier extensión del logging de seguridad debe respetar este switch y preservar metadatos mínimos de trazabilidad: `path`, `method`, `module_code`, `submodule_code`, `required_permission`, `decision_reason`, `company_id` y `role_ids`.

## 2026-05-30 — Aprendizaje

**Contexto:** Protección server-side de páginas administrativas y de catálogo bajo el nuevo RBAC de Kiriox.

**Regla aprendida:** Las páginas SSR sensibles no deben depender solo de ocultar navegación ni de validaciones cliente. Deben protegerse con `requirePageAccess`, usando un guard base en el layout para el permiso mínimo compartido del módulo y endureciendo cada página de escritura o edición con permisos más altos cuando corresponda.

**Aplicación futura:** Toda nueva página server-side de administración o catálogo debe validar acceso antes de renderizar. Usar el layout para la lectura común del módulo y reforzar páginas específicas con `W` o el permiso exacto requerido, manteniendo trazabilidad con `resourceType: 'page'`.

## 2026-05-30 — Aprendizaje

**Contexto:** Errores de compilación en Next.js build por uso de `useSearchParams()` en componentes cliente.

**Regla aprendida:** Cuando un componente cliente en la carpeta `src/modules/` utiliza `useSearchParams()` y es importado directamente por una página bajo `src/app/`, el compilador de Next.js arroja un error de prerenderizado estático (static prerender bailout) si la página no está envuelta en un límite de `<Suspense>`.

**Aplicación futura:** En todas las páginas cliente de Next.js que utilicen `useSearchParams()`, asegurar que el componente de la página sea exportado o envuelto dentro de un `<Suspense>` boundary en el archivo `page.tsx` de `src/app/`.

## 2026-05-30 — Aprendizaje

**Contexto:** Prevención proactiva de problemas de latencia y costosos desarrollos de optimización en dashboards y wizards de riesgo.

**Regla aprendida:** Para evitar reestructuraciones y refactorizaciones costosas de rendimiento una vez que el sistema está en producción, todo nuevo desarrollo de tablas, repositorios de persistencia o integraciones de red debe seguir estrictamente un checklist de diseño eficiente:
1. **Indexación Temprana Obligatoria**: Toda columna que actúe como llave foránea (FK) o campo de filtrado clave (`company_id`, `run_sa_id`, `activity_id`, `run_ra_id`, `owner_id`) debe declararse explícitamente con un índice (`@@index`) en `schema.prisma` durante la fase de modelado inicial. Esto erradica los escaneos secuenciales completos (`Table Scans`) que ralentizan drásticamente las consultas en PostgreSQL.
2. **Coherencia y Casteo Seguro de Joins**: Evitar realizar joins cruzando tipos de datos discrepantes (e.g., `text` y `uuid`). Si es inevitable debido a compatibilidad de datos legados o mixtos, implementar validaciones condicionales seguras en SQL (usando `CASE WHEN` y expresiones regulares) para asegurar que el motor de base de datos pueda aprovechar los índices primarios de las tablas destino.
3. **Restricción y Filtrado en Base de Datos (Anti Over-fetching)**: Nunca descargar colecciones masivas de datos a la memoria de la aplicación (Next.js/JavaScript) para luego filtrarlas. Las consultas en el repositorio de infraestructura deben restringir los resultados en el origen mediante cláusulas `WHERE` específicas (por ejemplo, delimitando los controles del run estructural a las actividades activas del subquery).
4. **Paralelización de Red en Cliente (Anti-Waterfall)**: En los hooks o componentes que inicializan pantallas complejas, las peticiones asíncronas independientes deben ser ejecutadas concurrentemente utilizando `Promise.all`. Evitar la concatenación lineal de promesas (`await`) que genera cascadas de red innecesarias y degrada la experiencia de usuario en conexiones con latencia.

**Aplicación futura:** Revisar y cumplir este checklist de diseño eficiente durante las fases de diseño previo y desarrollo de cualquier nueva pantalla, endpoint o repositorio.

## 2026-05-30 — Aprendizaje

**Contexto:** Gestor de paquetes y ejecución de comandos en el sistema Kiriox GRI v3.

**Regla aprendida:** El proyecto utiliza `pnpm` como gestor de paquetes de manera exclusiva. No se deben utilizar comandos de `npm` (como `npm run build` o `npm install`) para la compilación, instalación o ejecución de scripts, ya que esto altera los locks y dependencias del entorno.

**Aplicación futura:** Utilizar siempre comandos basados en `pnpm` (ej. `pnpm build`, `pnpm dev`, `pnpm install`, `pnpm dlx prisma ...`) para cualquier tarea de empaquetado, dependencias o base de datos.

## 2026-05-30 — Aprendizaje

**Contexto:** Verificación y chequeos de código en Kiriox GRI v3.

**Regla aprendida:** Para validar el tipado y corregir errores, es suficiente y preferible ejecutar el chequeo estático `npx tsc --noEmit`. No se debe ejecutar `pnpm build` ni construir la aplicación de producción durante el desarrollo interactivo a menos que se solicite de forma explícita, para evitar esperas y consumo innecesario de recursos.

**Aplicación futura:** Limitarse a usar `npx tsc --noEmit` para verificar la corrección del código y omitir compilaciones completas (`pnpm build`) de forma regular.

## 2026-05-30 — Aprendizaje

**Contexto:** Despliegue incompleto de sistemas en la matriz de roles y permisos debido a relaciones restrictivas en el endpoint de la API.

**Regla aprendida:** En Kiriox, las dimensiones de nivel superior como los sistemas en `public.security_system` deben consultarse directamente sin requerir un join con `security_module` si deseamos mostrarlos en su totalidad. Para que la asignación/desasignación de permisos en la matriz de seguridad funcione, cada sistema debe tener al menos un módulo correspondiente en `security_module` mapeado a nivel de aplicación en `securityModuleMap.ts`.

**Aplicación futura:** Al agregar nuevos sistemas corporativos a `security_system`, asegurar que se cree al menos un módulo asociado en `security_module` y se registre su mapeo en `securityModuleMap.ts`. En la API de permisos, usar consultas abiertas a la tabla de sistemas para evitar filtrados implícitos indeseados.

## 2026-05-30 — Aprendizaje

**Contexto:** Separación definitiva entre la administración de permisos por módulo y por sistema en Kiriox.

**Regla aprendida:** `/modelo/gobernanza/catalogo/roles-permisos` pertenece al nivel `security_module` y debe persistir exclusivamente en `map_role_x_module_x_permissions`. En cambio, `/main_dashboard` y `/gestion/dashboard_security` pertenecen al nivel `security_system` y deben usar `security_system`, `security_roles` y `map_role_x_system_x_permissions` como fuente de verdad. No se debe simular acceso por sistema agregando permisos de módulos.

**Aplicación futura:** Al modificar launchpad, paneles de seguridad o matrices RBAC, tratar sistema y módulo como capas distintas: sistema para visibilidad/acceso macro del producto, módulo para permisos operativos internos y exposición fina de funcionalidades.

## 2026-06-01 — Aprendizaje

**Contexto:** El usuario aclaró cuál es la referencia oficial de diseño UI activa para Kiriox en este repositorio.

**Regla aprendida:** La referencia oficial activa para el diseño de la experiencia de riesgo lineal es la ruta `/gestion/dashboard_riesgo_lineal`. En código, esa ruta monta `LinearRiskDashboardPage`, que alterna entre `StepDashboard` y `EvaluationWizard`; `GobIaDashboardPage` existe como pieza alternativa, pero no es la interfaz oficial actualmente servida.

**Aplicación futura:** Cuando se pidan rediseños, ajustes visuales o alineación de UI en Kiriox, usar `/gestion/dashboard_riesgo_lineal` como fuente de verdad para shell, cards, tabla ejecutiva, stepper y wizard del dominio de riesgo lineal, evitando tomar como referencia páginas no montadas.

## 2026-06-02 — Aprendizaje

**Contexto:** Correccion del usuario al agregar la opcion `Inicio` en el sidebar operativo.

**Regla aprendida:** La entrada `Inicio` del sidebar derivada del modulo `core` debe navegar a `/score/dashboard2`. Esto no reemplaza la regla de que `/main_dashboard` sigue siendo el launchpad central post-login; son destinos distintos dentro de la experiencia.

**Aplicación futura:** Al ajustar navegacion del shell lateral o renombrar la entrada principal del modulo `core`, conservar la distincion entre launchpad global (`/main_dashboard`) y dashboard operativo (`/score/dashboard2`).

## 2026-06-02 — Aprendizaje

**Contexto:** La opcion `Inicio` no aparecia en el sidebar aunque se modificara `core.module.ts`.

**Regla aprendida:** En Kiriox, la visibilidad del sidebar dinamico depende de `enabledModules`, y `enabledModules` solo incluye modulos con permiso `A`. Si `Inicio` debe mostrarse siempre como acceso operativo del shell, no puede depender solo del `nav` del modulo `core`; debe anteponerse desde `Sidebar.tsx` o una capa equivalente del shell.

**Aplicación futura:** Para accesos globales del shell que deban permanecer visibles aun cuando el RBAC module-level excluya `core`, implementarlos en la composicion del sidebar con deduplicacion del item dinamico, no solo en `buildNavigation`.

## 2026-06-02 — Aprendizaje

**Contexto:** Alta de una nueva ruta en `src/app/gestion/dashboard_riesgo_sistemico/page.tsx`.

**Regla aprendida:** En este repositorio, al crear nuevas rutas App Router, `npx tsc --noEmit` puede fallar porque `.next/types` queda desalineado aunque `.next/dev/types` ya reconozca la pagina. Antes de validar tipado tras agregar una ruta, ejecutar `pnpm exec next typegen` para sincronizar los route types.

**Aplicación futura:** Cada vez que se agregue, renombre o elimine una pagina en `src/app/**`, correr `pnpm exec next typegen` antes del chequeo estático final para evitar falsos negativos en `validator.ts` y `routes.d.ts`.

## 2026-06-02 — Aprendizaje

**Contexto:** Definicion funcional del endpoint `/gestion/dashboard_riesgo_sistemico`.

**Regla aprendida:** `/gestion/dashboard_riesgo_sistemico` no es el canvas operativo del grafo. Debe funcionar como dashboard ejecutivo del MVP `Dashboard GRI Structural Map`, articulado en dos tarjetas principales: `Structural Analysis Engine` y `Cascade Simulation Engine`, con diferenciacion explicita entre GRC tradicional y analisis estructural GRI.

**Aplicación futura:** Mantener esta ruta como capa de propuesta, narrativa y demostracion comercial del MVP. Los motores operativos siguen expuestos por separado: diagnostico estructural en `/gestion/dashboard_riesgo_estructural` y mapa/cascada en `/score/dashboard2`.

## 2026-06-03 — Aprendizaje

**Contexto:** Correccion de la funcion SQL `public.fn_elena_systemic_structural_analysis(uuid, uuid)` en la base conectada a Kiriox.

**Regla aprendida:** El esquema sistemico estructural vigente no usa columnas anchas tipo `root_entity_id`, `max_depth`, `finished_at`, `run_id`, `incoming_count` o `structural_score` dentro de una sola fila. La fuente de verdad es `systemic_structural_analysis_runs` para la corrida y `systemic_structural_metrics` como tabla normalizada por `metric_type`, con `completed_at` y `structural_analysis_run_id` como claves de trazabilidad.

**Aplicación futura:** Toda funcion o migracion que persista analisis estructural sistemico debe alinearse con el modelo normalizado actual: registrar la corrida en `systemic_structural_analysis_runs` y descomponer los resultados por entidad en `systemic_structural_metrics`, usando `metric_details` para campos compuestos como relaciones entrantes/salientes, dependencias, dependientes y bandera SPOF.


# Para administrar
/admin


# plugin
npx plugins add vercel/vercel-plugin

## 2026-06-03 — Aprendizaje

**Contexto:** Implementacion y despliegue en la base real del paquete inicial de funciones SQL para analisis estructural sistemico de Kiriox.

**Regla aprendida:** La capa estructural GRI ya cuenta con cinco funciones PostgreSQL genericas y reutilizables sobre el grafo sistemico real: `fn_elena_systemic_structural_analysis`, `fn_elena_systemic_cascade_simulation`, `fn_elena_systemic_criticality_analysis`, `fn_elena_systemic_resilience_analysis` y `fn_elena_systemic_exposure_analysis`. Todas deben operar sobre `public.systemic_entities`, `public.systemic_entity_relations`, `public.systemic_relation_types`, `public.systemic_structural_analysis_runs`, `public.systemic_structural_metrics`, `public.systemic_simulation_runs`, `public.systemic_simulation_impacts` y `public.systemic_propagation_paths`, usando el esquema vigente y no nombres inventados. Los codigos solicitados que no existen literalmente en la base deben mapearse a los reales del grafo, por ejemplo `SUPPORTED_BY` -> `SUPPORTS` inverso, `PROVIDED_BY` -> `PROVIDES` inverso, `AFFECTS` -> `IMPACTS`, `ACTIVATES` -> `TRIGGERS`, `CONTROLLED_BY` -> `PROTECTS`/`MITIGATES` y `EVIDENCED_BY` -> `EVIDENCES` inverso.

**Aplicación futura:** Todo nuevo motor SQL del dominio estructural debe extender esta familia de funciones genericas, conservar la separacion entre corrida y metricas normalizadas, respetar profundidad maxima y proteccion contra ciclos, persistir trazabilidad en las tablas sistemicas reales y evitar cualquier acoplamiento a Pagos Digitales, bancos o nombres concretos de entidades.

## 2026-06-03 — Aprendizaje

**Contexto:** Correccion del usuario para remover `Análisis preventivo` del sidebar operativo.

**Regla aprendida:** El modulo `incident` debe permanecer registrado como capacidad del sistema, pero no debe publicar entrada en el sidebar. Su contrato correcto es `family: "platform"` y sin propiedad `nav`.

**Aplicación futura:** Si `incident` vuelve a exponerse visualmente, debe hacerse solo por una decision explicita de producto. Mientras tanto, conservar sus rutas y logica internas sin item visible en la navegacion lateral.

## 2026-06-03 — Aprendizaje

**Contexto:** Deteccion de enlace visible apuntando a `/incident/dashboard` despues de ocultar `Análisis preventivo` del sidebar.

**Regla aprendida:** `/incident/dashboard` no es una ruta App Router vigente en este repositorio. Mientras la experiencia operativa de incidentes siga expuesta en `/validacion/eventos?tab=hechos-relevantes`, ningun acceso visible del producto debe apuntar a `/incident/dashboard`.

**Aplicación futura:** Al configurar cards del launchpad, shortcuts o accesos visibles relacionados con incidentes/analisis preventivo, usar la ruta viva del producto y no revivir endpoints legados inexistentes.

## 2026-06-03 — Aprendizaje

**Contexto:** Ajuste de UX en `/gestion/structural-map/[serviceId]` para la creacion manual de relaciones del grafo.

**Regla aprendida:** La creacion de relaciones en el structural map no debe limitarse a un formulario minimo de tres campos. La UI debe permitir definir tambien `weight`, `strength` y `description`, y el flujo preferido debe poder arrancar visualmente desde el grafo usando seleccion de nodos para prellenar origen y destino.

**Aplicación futura:** En evoluciones del builder grafico, preservar un patron mixto: seleccion visual sobre el canvas para contexto espacial y formulario estructurado para completar los atributos de la relacion antes de persistirla.

## 2026-06-03 — Aprendizaje CRÍTICO (Alta Prioridad)

**Contexto:** Bloqueo del menú contextual nativo (clic derecho) del navegador sobre librerías complejas de `<canvas>` (específicamente Cytoscape.js) para desplegar un menú propio del sistema.

**Regla aprendida:** ¡ATENCIÓN! Los eventos sintéticos de React (`onContextMenu`), los listeners locales en el contenedor (`container.addEventListener`), e incluso las llamadas a `preventDefault()` dentro de la propia librería (`cy.on('cxttap')`) **suelen fallar silenciosamente** o perder la carrera contra el navegador al interceptar el menú nativo debido a la forma errática en que los nodos del canvas son manipulados.
La ÚNICA FORMA INFALIBLE ("Escudo Definitivo") de bloquear el menú nativo en estas interfaces ricas es inyectar un listener a nivel de `document` ejecutándose en la **fase de captura** (`capture: true`):

```javascript
// Dentro de un useEffect en el componente contenedor
useEffect(() => {
  const preventNativeMenu = (e) => { e.preventDefault(); e.stopPropagation(); return false; };
  document.addEventListener('contextmenu', preventNativeMenu, { capture: true });
  return () => document.removeEventListener('contextmenu', preventNativeMenu, { capture: true });
}, []);
```

**Aplicación futura (CONSULTA OBLIGATORIA):** Siempre que se deba anular el menú del clic derecho del navegador para dibujar un menú del sistema en interfaces complejas (grafos, mapas, editores visuales), NO perder el tiempo con handlers locales. Se debe aplicar INMEDIATAMENTE el bloqueo a nivel global de `document` en fase de captura durante el tiempo de vida del componente (`useEffect`).

## 2026-06-04 — Aprendizaje

**Contexto:** Cambio de endpoint para la pantalla del builder que se abre desde `Abrir modelo` en `/gestion/structural-map`.

**Regla aprendida:** La pantalla operativa del modelo estructural no debe exponerse como ruta dinámica principal `/gestion/structural-map/[serviceId]`. El endpoint canónico visible para abrir, analizar o simular un servicio es `/gestion/structural-map/modelo` usando `serviceId` en querystring.

**Aplicación futura:** Los accesos visibles del portafolio (`Abrir modelo`, `Analizar`, `Simular`) deben apuntar a `/gestion/structural-map/modelo?serviceId=...`, mientras que la ruta dinámica antigua puede mantenerse solo como redirección de compatibilidad.

## 2026-06-04 — Aprendizaje

**Contexto:** Evolucion de la creacion contextual de entidades dentro del canvas en `/gestion/structural-map/modelo`.

**Regla aprendida:** Cuando el usuario invoque `Crear entidad` desde el menu contextual del canvas, la captura no debe redirigir al panel lateral. Debe abrirse un modal flotante y movible, cerca del punto de clic, para completar los campos de la nueva entidad sin perder el contexto visual del grafo.

**Aplicación futura:** En builders visuales de Kiriox, las acciones contextuales del canvas deben resolverse preferiblemente con overlays locales y movibles. Si la entidad creada aun no tiene relaciones persistidas, puede mostrarse de inmediato como nodo local en el canvas hasta que el usuario la vincule formalmente.

## 2026-06-04 — Aprendizaje

**Contexto:** Evolucion del flujo de creacion de relaciones directamente sobre nodos del structural map.

**Regla aprendida:** Al seleccionar una entidad en el canvas, el sistema puede exponer un anillo de acciones `+` alrededor del nodo para iniciar la creacion visual de relaciones. El usuario debe elegir primero el nodo origen, luego el nodo destino en el canvas, y solo despues completar los atributos estructurados de la relacion en un modal compacto.

**Aplicación futura:** Para relaciones graficas en Kiriox, preferir un flujo espacial `nodo origen -> acciones orbitantes -> nodo destino -> modal de atributos` antes que depender unicamente de formularios laterales desconectados del grafo.

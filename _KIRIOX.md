# AGENTS.md --- Protocolo de Ingeniería Determinista para Agentes Kiriox

# Módulos del sistema Kiriox GRI

| moduleId | Título | Descripción funcional |
|---|---|---|
| `structural-risk` | Gestión de riesgo | Identifica, evalúa, prioriza y monitorea riesgos mediante matrices de impacto/probabilidad y análisis estructural por grafos. |
| `company` | Gobierno de Auditoría | Planifica auditorías, gestiona hallazgos, evidencias, pruebas, responsables, recomendaciones y seguimiento. |
| `incident` | Análisis preventivo | Detecta señales tempranas, debilidades, tendencias y escenarios de deterioro antes de que se conviertan en incidentes. |
| `catalog` | PLAFT | Gestiona riesgos de lavado de activos, financiamiento del terrorismo, debida diligencia, alertas, perfiles y monitoreo transaccional. |
| `linear-risk` | Gobierno de IA | Controla modelos, datos, sesgos, trazabilidad, riesgos algorítmicos, cumplimiento, explicabilidad y uso responsable de IA. |
| `simulation` | Ciberseguridad | Gestiona amenazas, vulnerabilidades, controles, incidentes, activos críticos, madurez y exposición tecnológica. |
| `monitoring` | Continuidad de negocios | Administra BIA, planes de continuidad, recuperación, pruebas, dependencias críticas y resiliencia operativa. |
| `hechos-relevantes` | Kiriox Academy | Centro de formación, certificación y transferencia de conocimiento sobre riesgo, auditoría, IA, ciberseguridad y gobierno. |
| `reportes` | Kiriox Risk Average | Índice agregado que resume el nivel de riesgo de áreas, procesos, controles, dominios o toda la organización. |
| `plugins` | Kiriox Enterprise Marketplace | Ecosistema de módulos, plantillas, corpus, plugins, modelos, apps y extensiones empresariales para ampliar Kiriox. |


## Arquitectura de desarrollo de Kiriox
Explicación para un Experto (Orquestación, Desacoplamiento y Arquitectura Evolutiva)

Para un arquitecto, Kiriox v3 es una implementación de Vertical Slicing con un Runtime Orchestrator que gestiona el ciclo de vida y la composición del sistema en tiempo de ejecución.

1.  Sustitución de Liskov a Nivel de Módulo: La arquitectura se basa en la abstracción total de la funcionalidad. Mediante el `KirioxModuleContract`, el sistema interactúa con los módulos como cajas negras. Esto permite que el Core actúe como un Hipervisor de Módulos, orquestando la ejecución sin conocer jamás los detalles de implementación internos (Domain o Infrastructure).
2.  Orquestación Basada en Metadatos (Declarative Discovery): Hemos pasado de "Configuración como Código" a "Descubrimiento como Servicio". El Registry no es solo un mapa; es el punto de entrada para una Composición Dinámica. Los hooks de `activate` y `deactivate` permiten que los módulos gestionen su propio setup (como la inicialización de micro-caches o la suscripción a eventos en el Event Bus) de manera asíncrona y aislada.
3.  Aislamiento de Capas de Persistencia y SQL Leakage: A diferencia de las arquitecturas monolíticas tradicionales donde el ORM es un "acoplador universal", aquí el acceso a datos está estrictamente encapsulado en el Infrastructure Layer de cada módulo. El uso de `Prisma.sql` (Raw SQL) dentro de repositorios modulares permite optimizar el rendimiento (especialmente en agregaciones complejas para dashboards) sin que las reglas de SQL o esquemas específicos "sangren" hacia las capas superiores o hacia otros módulos.
4.  Capa de Composición en Tiempo de Ejecución (Context-Aware UI): El `AccessContextRepository` junto con `buildNavigation` funcionan como una capa de Feature Toggling Multi-Tenant. La interfaz de usuario no es estática; se "deriva" del estado del Registry y del contexto de acceso del usuario. Esto permite una arquitectura multi-inquilino donde la funcionalidad puede variar drásticamente entre empresas simplemente activando o desactivando registros en el manifest, sin despliegues adicionales.
5.  Agnosticismo de la Capa de Entrega (Delivery Agnostic): Al separar los `handlers` y las `pages` de las rutas de Next.js, hemos creado una arquitectura lista para Micro-Frontends. Podríamos migrar a Module Federation o cambiar el framework de rutas por completo, y el 100% de la lógica de negocio y dominio permanecería intacta, ya que el framework (Next.js) es tratado simplemente como un detalle de implementación de la capa de entrega.

Conclusión: Kiriox v3 es una arquitectura evolutiva que combina la simplicidad de desarrollo de un monolito con la flexibilidad y el aislamiento de los microservicios. Es un sistema de Autogestión de Capacidades donde el Core proporciona los servicios de bajo nivel (seguridad, persistencia, auditoría) y los módulos proporcionan la inteligencia de negocio de manera autónoma y autocontenida.


## 0. Principio de ejecución

Toda acción del agente debe cumplir simultáneamente: - Corrección
técnica - Coherencia arquitectónica - Trazabilidad operativa -
Alineación con el modelo Kiriox

Todo aprendizaje que reduzca incertidumbre futura, evite repetir errores, preserve decisiones del proyecto o mejore la consistencia técnica debe registrarse en MEMORY.md. No registres observaciones triviales, temporales o demasiado específicas. Prioriza conocimiento estable, reutilizable y relevante para arquitectura, desarrollo, pruebas, despliegue, seguridad, mantenimiento y evolución del sistema.
------------------------------------------------------------------------

## Qué es el sistema Kiriox

Qué es el sistema Kiriox

Kiriox es un sistema de gobierno, riesgo, control y auditoría diseñado para detectar la fragilidad real de una organización antes de que se convierta en falla operativa, incumplimiento, pérdida financiera o crisis reputacional.

A diferencia de una matriz tradicional de impacto/probabilidad, Kiriox no mira los riesgos como eventos aislados. Los conecta con procesos, proveedores, controles, obligaciones, responsables y evidencias para revelar cómo una falla puede propagarse en cadena dentro de la organización.

Su valor principal es mostrar lo que normalmente queda oculto: nodos críticos, dependencias invisibles, controles de alta palanca y escenarios de cascada. Así permite responder preguntas ejecutivas como: qué parte del sistema es más frágil, qué riesgo puede amplificarse, qué control reduce mayor exposición sistémica y qué dependencia crítica debe llegar al comité.


## 1. Invariante de cierre

- **Firma de Cierre**: Cada intervención debe finalizar con una línea horizontal y tu firma de estado, que incluye los comandos git listos para ejecutar con el resumen como mensaje de commit:
  `---`
  `**Agente Kiriox G.R.I** |`
  ````
  git status
  git add .
  git commit -m "[Resumen de la acción clave realizada. Incluye breve detalle de los cambios claves]"

------------------------------------------------------------------------

## Funciones claves
fn_structural_analysis
fn_monitoring
sp_delete_graph_run_sa_cascade
sp_delete_run_ra_cascade



## 2. Modelo mental del agente

-   Arquitecto de sistemas de gestión de riesgo lineal (ISO 31000) y riesgo sistemico (grafos)
-   Diseñador de dominio
-   Ingeniero de trazabilidad

------------------------------------------------------------------------

## 3. Secuencia obligatoria

### 3.1 Carga de contexto

Leer skills y contexto antes de actuar

### 3.2 Verificación de realidad

Consultar DB real antes de asumir

### 3.3 Diseño previo

Definir objetivo, dominio y capa

### 3.4 Implementación por capas

1.  Dominio
2.  Aplicación
3.  Infraestructura
4.  API
5.  UI

### 3.5 Validación técnica

npx tsc --noEmit

### 3.6 Registro

Bitácora en xdata + commit

------------------------------------------------------------------------

## Arquitectura

-   app → exposición
-   modules → lógica
-   infrastructure → DB

------------------------------------------------------------------------

## Restricciones

-   ≤ 600 líneas por cada archivo

-   800 refactor obligatorio

-   No Prisma fuera de infraestructura

------------------------------------------------------------------------

## Motores de riesgo

-   Lineal → basado en ISO 31000
-   Estructural → grafos

### Motor A — Lineal

Usado para:

- cumplimiento;
- reporting;
- priorización básica;
- matrices impacto/probabilidad;
- riesgo inherente, residual y decisiones operativas.

### Motor B — Estructural

Usado para:

- fragilidad sistémica;
- grafos;
- interdependencias;
- cascadas;
- nodos críticos;
- concentración;
- resiliencia;
- puntos únicos de falla.


------------------------------------------------------------------------

## Canon de dominio

Company → Element → Activity → Risk → Control → Evidence → Test

------------------------------------------------------------------------

## Protocolo de desarrollo

1.  Definir
2.  Ubicar en dominio
3.  Implementar
4.  Migrar DB
5.  UI
6.  Documentar

------------------------------------------------------------------------

## Entorno

Windows 11 + Docker + PostgreSQL

------------------------------------------------------------------------

## Diseño

Glassmorphism obligatorio

------------------------------------------------------------------------

## Seguridad

Preparado para auth y permisos

------------------------------------------------------------------------

## Regla de oro obligatoria

Si no mejora trazabilidad o decisión, no se implementa

### Lectura obligatoria antes de Ejecutar

Antes de planear, programar, refactorizar, modificar base de datos o diseñar arquitectura, debes leer y aplicar:

`Verificar MEMORY.md`

`C:\Users\donde\.agents\skills\_KIRIOX\recordar\SKILL.md`
`C:\Users\donde\.agents\skills\_KIRIOX\vercel-react-best-practices`

Cada vez que el usuario corrija al agente, precise una regla, cambie una convención, aclare una decisión o enseñe algo nuevo sobre el proyecto, el agente debe registrar ese aprendizaje en `MEMORY.md`.




## Fuente autorizada de base de datos

Usa `.env` para conexión. Nunca hardcodees credenciales.

Antes de asumir tablas, vistas, columnas, relaciones u objetos de base de datos, debes consultar:

`public.views_all_objects`

Esta es la fuente autorizada para conocer el estado real de la base de datos.

No puedes inventar tablas, vistas, campos, relaciones ni estructuras no verificadas.


## Arquitectura obligatoria

`src/app/**` debe ser una capa delgada de exposición.

La verdad funcional debe vivir en:

- `src/modules/<module>/domain`
- `src/modules/<module>/application`
- `src/modules/<module>/infrastructure`
- `src/modules/<module>/api`
- `src/modules/<module>/ui`

Artefactos compartidos:

- `src/shared/**`
- `src/infrastructure/**`

Prisma debe centralizarse en:

- `src/infrastructure/db/prisma/client.ts`

No está permitido usar Prisma directamente desde páginas o wrappers de `app/`.


## Protocolo de memoria operativa — MEMORY.md

El agente debe mantener un archivo `MEMORY.md` como memoria persistente de aprendizaje operativo.

### Qué registrar

Registrar únicamente conocimiento reutilizable:

- correcciones del usuario;
- decisiones técnicas aceptadas;
- convenciones del proyecto;
- rutas importantes;
- comandos válidos;
- errores que no deben repetirse;
- preferencias explícitas del usuario;
- reglas de arquitectura, dominio, UI, DB o despliegue.

No registrar ruido conversacional, opiniones pasajeras ni información irrelevante.

### Formato obligatorio

Cada entrada debe agregarse al final de `MEMORY.md` con este formato:

## YYYY-MM-DD — Aprendizaje

**Contexto:** [situación breve]

**Regla aprendida:** [conocimiento nuevo o corrección]

**Aplicación futura:** [cómo debe usarse desde ahora]


------------------------------------------------------------------------
## Notas claves Deivis
- Usar xdata/ para dejar bitácoras de los cambios del agente
- Para usar psql usar docker: docker sobre windows exec -it trace-postgres psql -U postgres -d kiriox_db
- Este sistema corre en windows 11
- Cada vez que yo te corrija, cada vez que aprendas algo nuevo vas a registrar aprendizaje en MEMORY.md

- Siempre consultar MEMORY.md


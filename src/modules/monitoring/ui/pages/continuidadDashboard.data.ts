export type ContinuidadMetric = {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "emerald" | "amber" | "violet";
};

export type ContinuidadScenario = {
  id: string;
  title: string;
  process: string;
  severity: "critico" | "alto" | "medio";
  signal: string;
};

export type ContinuidadDependency = {
  id: string;
  name: string;
  domain: string;
  status: "vulnerable" | "estable" | "seguimiento";
  owner: string;
};

export type ContinuidadControl = {
  name: string;
  coverage: number;
  readiness: number;
  note: string;
};

export const continuidadMetrics: ContinuidadMetric[] = [
  {
    label: "Procesos críticos priorizados",
    value: "24",
    detail: "Procesos con BIA y ventana de recuperación definida",
    tone: "blue",
  },
  {
    label: "Planes vigentes",
    value: "89%",
    detail: "Cobertura sobre operaciones esenciales y servicios compartidos",
    tone: "emerald",
  },
  {
    label: "Dependencias con atención",
    value: "11",
    detail: "Terceros, infraestructura y puntos únicos de falla en seguimiento",
    tone: "amber",
  },
  {
    label: "Resiliencia operativa",
    value: "3.9 / 5",
    detail: "Capacidad general dentro del umbral con focos concentrados",
    tone: "violet",
  },
];

export const continuidadScenarios: ContinuidadScenario[] = [
  {
    id: "BCP-041",
    title: "Interrupción prolongada del canal digital",
    process: "Canales y atención",
    severity: "critico",
    signal: "RTO comprometido por dependencia compartida de autenticación",
  },
  {
    id: "BCP-033",
    title: "Caída de proveedor de mensajería transaccional",
    process: "Operaciones críticas",
    severity: "alto",
    signal: "Plan alterno definido pero con pruebas parciales",
  },
  {
    id: "BCP-027",
    title: "Indisponibilidad de mesa operativa regional",
    process: "Backoffice",
    severity: "medio",
    signal: "Capacidad de traslado validada, con dotación aún incompleta",
  },
];

export const continuidadDependencies: ContinuidadDependency[] = [
  {
    id: "DEP-014",
    name: "Proveedor cloud core",
    domain: "Infraestructura",
    status: "seguimiento",
    owner: "Tecnología",
  },
  {
    id: "DEP-019",
    name: "Operador de autenticación",
    domain: "Canales",
    status: "vulnerable",
    owner: "Arquitectura empresarial",
  },
  {
    id: "DEP-008",
    name: "Sitio alterno operativo",
    domain: "Continuidad física",
    status: "estable",
    owner: "Facilities & BCM",
  },
];

export const continuidadControls: ContinuidadControl[] = [
  {
    name: "BIA y priorización operativa",
    coverage: 93,
    readiness: 88,
    note: "Base sólida; faltan ajustes menores en procesos satélite.",
  },
  {
    name: "Planes de continuidad y recuperación",
    coverage: 87,
    readiness: 81,
    note: "Actualizar anexos de escalamiento y contactos extendidos.",
  },
  {
    name: "Pruebas y simulacros",
    coverage: 76,
    readiness: 72,
    note: "Aumentar frecuencia de pruebas integradas con terceros.",
  },
  {
    name: "Gestión de dependencias críticas",
    coverage: 79,
    readiness: 74,
    note: "Reforzar evidencias de contingencia en proveedores clave.",
  },
];

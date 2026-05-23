export type CiberMetric = {
  label: string;
  value: string;
  detail: string;
  tone: "red" | "amber" | "cyan" | "violet";
};

export type CiberThreat = {
  id: string;
  title: string;
  vector: string;
  severity: "critica" | "alta" | "media";
  signal: string;
};

export type CiberAsset = {
  id: string;
  name: string;
  domain: string;
  status: "expuesto" | "endurecido" | "observacion";
  owner: string;
};

export type CiberControl = {
  name: string;
  coverage: number;
  resilience: number;
  note: string;
};

export const ciberMetrics: CiberMetric[] = [
  {
    label: "Activos críticos monitoreados",
    value: "142",
    detail: "Cobertura continua sobre crown jewels y servicios expuestos",
    tone: "cyan",
  },
  {
    label: "Vulnerabilidades altas abiertas",
    value: "19",
    detail: "7 en ventanas de remediación vencidas",
    tone: "red",
  },
  {
    label: "Controles de defensa activos",
    value: "88%",
    detail: "EDR, IAM, segmentación y hardening bajo seguimiento",
    tone: "violet",
  },
  {
    label: "Exposición residual ciber",
    value: "2.7 / 5",
    detail: "Concentración principal en superficie perimetral",
    tone: "amber",
  },
];

export const ciberThreats: CiberThreat[] = [
  {
    id: "THR-118",
    title: "Credenciales comprometidas en acceso remoto",
    vector: "Identidad",
    severity: "critica",
    signal: "Patrones de autenticación anómalos desde geolocalizaciones no habituales",
  },
  {
    id: "THR-111",
    title: "Exposición de servicio legado sin parche crítico",
    vector: "Perímetro",
    severity: "alta",
    signal: "Activo publicado con CVE priorizada y fingerprint confirmado",
  },
  {
    id: "THR-104",
    title: "Movimiento lateral potencial en segmento administrativo",
    vector: "Red interna",
    severity: "media",
    signal: "Correlación de eventos EDR con elevación de privilegios puntual",
  },
];

export const ciberAssets: CiberAsset[] = [
  {
    id: "AST-044",
    name: "Gateway de banca digital",
    domain: "Canales",
    status: "expuesto",
    owner: "Arquitectura de canales",
  },
  {
    id: "AST-051",
    name: "Cluster de analítica regulatoria",
    domain: "Datos",
    status: "endurecido",
    owner: "Plataforma de datos",
  },
  {
    id: "AST-039",
    name: "Servidor de integración legado",
    domain: "Middleware",
    status: "observacion",
    owner: "Infraestructura core",
  },
];

export const ciberControls: CiberControl[] = [
  {
    name: "Gestión de vulnerabilidades",
    coverage: 86,
    resilience: 78,
    note: "Se requiere acelerar SLA de cierre para hallazgos perimetrales.",
  },
  {
    name: "Defensa de identidad y acceso",
    coverage: 91,
    resilience: 84,
    note: "MFA y detección adaptativa sólidos; falta cerrar brechas de cuentas técnicas.",
  },
  {
    name: "Segmentación y contención",
    coverage: 74,
    resilience: 71,
    note: "Persisten zonas planas en red administrativa heredada.",
  },
  {
    name: "Monitoreo y respuesta",
    coverage: 89,
    resilience: 82,
    note: "Buen tiempo de detección; mejorar playbooks de escalamiento cruzado.",
  },
];

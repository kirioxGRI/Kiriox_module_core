export type GobIaMetric = {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "cyan" | "amber" | "violet";
};

export type GobIaRisk = {
  id: string;
  title: string;
  domain: string;
  severity: "critico" | "alto" | "medio";
  signal: string;
};

export type GobIaModel = {
  id: string;
  name: string;
  purpose: string;
  status: "aprobado" | "monitoreo" | "en_revision";
  owner: string;
};

export type GobIaControl = {
  name: string;
  maturity: number;
  coverage: number;
  note: string;
};

export const gobIaMetrics: GobIaMetric[] = [
  {
    label: "Modelos inventariados",
    value: "27",
    detail: "18 productivos, 9 en experimentación controlada",
    tone: "blue",
  },
  {
    label: "Modelos con trazabilidad completa",
    value: "81%",
    detail: "Dataset, versionado, owner y expediente aprobatorio",
    tone: "cyan",
  },
  {
    label: "Incidencias éticas abiertas",
    value: "4",
    detail: "2 ligadas a explicabilidad y 2 a sesgo de segmentos",
    tone: "amber",
  },
  {
    label: "Exposición residual IA",
    value: "2.4 / 5",
    detail: "Por debajo del umbral, con presión en modelos críticos",
    tone: "violet",
  },
];

export const gobIaRisks: GobIaRisk[] = [
  {
    id: "AI-RSK-12",
    title: "Drift de desempeño en scoring de admisión",
    domain: "Monitoreo",
    severity: "critico",
    signal: "Desvío de 11.8% vs. baseline trimestral",
  },
  {
    id: "AI-RSK-09",
    title: "Explicabilidad insuficiente para comité",
    domain: "Gobierno",
    severity: "alto",
    signal: "Faltan artefactos de razonamiento y matriz de variables",
  },
  {
    id: "AI-RSK-06",
    title: "Sesgo potencial en microsegmentos regionales",
    domain: "Ética y sesgo",
    severity: "medio",
    signal: "Dispersión superior a tolerancia en dos cohortes",
  },
];

export const gobIaModels: GobIaModel[] = [
  {
    id: "MDL-021",
    name: "Originación PyME v4",
    purpose: "Scoring de admisión para cartera comercial",
    status: "monitoreo",
    owner: "Risk Analytics",
  },
  {
    id: "MDL-017",
    name: "Detección de fraude transaccional",
    purpose: "Alertamiento en tiempo real para operaciones anómalas",
    status: "aprobado",
    owner: "Seguridad analítica",
  },
  {
    id: "MDL-025",
    name: "Clasificador documental KYC",
    purpose: "Automatización de validación preliminar de expedientes",
    status: "en_revision",
    owner: "Cumplimiento digital",
  },
];

export const gobIaControls: GobIaControl[] = [
  {
    name: "Inventario y clasificación de modelos",
    maturity: 92,
    coverage: 96,
    note: "Buen nivel de gobierno base; falta completar taxonomía en sandbox.",
  },
  {
    name: "Trazabilidad de datasets y features",
    maturity: 84,
    coverage: 79,
    note: "Persisten brechas en linaje histórico de features heredadas.",
  },
  {
    name: "Monitoreo de drift y performance",
    maturity: 76,
    coverage: 82,
    note: "Se requieren alertas más tempranas para modelos de originación.",
  },
  {
    name: "Controles de sesgo y explicabilidad",
    maturity: 68,
    coverage: 74,
    note: "Área prioritaria para comité técnico y compliance.",
  },
];

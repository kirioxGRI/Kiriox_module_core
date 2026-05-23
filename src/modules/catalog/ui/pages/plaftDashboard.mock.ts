export type PlaftMetric = {
  label: string;
  value: string;
  detail: string;
  tone: "emerald" | "amber" | "cyan" | "violet";
};

export type PlaftAlert = {
  id: string;
  title: string;
  description: string;
  severity: "critica" | "alta" | "media";
  owner: string;
};

export type PlaftCase = {
  id: string;
  subject: string;
  segment: string;
  status: "en_analisis" | "pendiente_evidencia" | "escalado_uif";
  aging: string;
};

export type PlaftControl = {
  name: string;
  coverage: number;
  effectiveness: number;
  gap: string;
};

export const plaftMetrics: PlaftMetric[] = [
  {
    label: "Alertas monitoreadas",
    value: "1,284",
    detail: "+8.4% vs. corte anterior",
    tone: "cyan",
  },
  {
    label: "Casos priorizados",
    value: "36",
    detail: "12 requieren decisión en 48h",
    tone: "amber",
  },
  {
    label: "Debida diligencia vigente",
    value: "94.8%",
    detail: "Cobertura sobre clientes de alto riesgo",
    tone: "emerald",
  },
  {
    label: "Exposición residual PLAFT",
    value: "2.1 / 5",
    detail: "Dentro del apetito, con focos concentrados",
    tone: "violet",
  },
];

export const plaftAlerts: PlaftAlert[] = [
  {
    id: "ALT-219",
    title: "Concentración transaccional atípica",
    description: "Incremento no habitual en operaciones internacionales del segmento corporativo.",
    severity: "critica",
    owner: "Oficial de Cumplimiento",
  },
  {
    id: "ALT-203",
    title: "Perfil documental desactualizado",
    description: "Clientes PEP con documentación KYC vencida y actividad sostenida.",
    severity: "alta",
    owner: "Equipo KYC",
  },
  {
    id: "ALT-197",
    title: "Fragmentación operativa",
    description: "Múltiples operaciones por debajo del umbral, distribuidas en cuentas relacionadas.",
    severity: "media",
    owner: "Monitoreo transaccional",
  },
];

export const plaftCases: PlaftCase[] = [
  {
    id: "CASE-044",
    subject: "Grupo exportador con beneficiarios finales incompletos",
    segment: "Corporativo",
    status: "en_analisis",
    aging: "18 h",
  },
  {
    id: "CASE-039",
    subject: "Cliente PEP con actualización documental pendiente",
    segment: "Banca privada",
    status: "pendiente_evidencia",
    aging: "2 d",
  },
  {
    id: "CASE-031",
    subject: "Secuencia de transferencias trianguladas",
    segment: "PYME",
    status: "escalado_uif",
    aging: "5 h",
  },
];

export const plaftControls: PlaftControl[] = [
  {
    name: "Screening listas restrictivas",
    coverage: 99,
    effectiveness: 93,
    gap: "Ajustar reglas para alias y transliteraciones.",
  },
  {
    name: "Debida diligencia reforzada",
    coverage: 91,
    effectiveness: 87,
    gap: "Faltan renovaciones en clientes de alto riesgo histórico.",
  },
  {
    name: "Monitoreo transaccional",
    coverage: 96,
    effectiveness: 84,
    gap: "Calibrar escenarios de fragmentación y uso de terceros.",
  },
  {
    name: "Reporte regulatorio",
    coverage: 100,
    effectiveness: 95,
    gap: "Sin brecha material, mantener trazabilidad de anexos.",
  },
];

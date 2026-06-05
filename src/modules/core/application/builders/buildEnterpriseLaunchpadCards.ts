export type EnterpriseLaunchpadCard = {
  id: string;
  systemCode: string;
  title: string;
  description: string;
  href: string;
  iconKey: string;
  accent: "blue" | "violet" | "cyan";
  order: number;
};

type SecuritySystemSummary = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

type CardPresentation = {
  href: string;
  iconKey: string;
  accent: "blue" | "violet" | "cyan";
  order: number;
  description?: string;
  /** Excluir del main_dashboard — solo aparece en /admin */
  adminOnly?: boolean;
  /** Ocultar siempre del launchpad, aunque el sistema esté habilitado */
  hidden?: boolean;
};

const SYSTEM_PRESENTATION: Partial<Record<string, CardPresentation>> = {
  gestion_riesgo: {
    href: "/score/dashboard2",
    iconKey: "shield",
    accent: "blue",
    order: 10,
  },
  gobierno_auditoria: {
    href: "/gestion/dashboard_auditoria",
    iconKey: "building",
    accent: "blue",
    order: 20,
  },
  analisis_preventivo: {
    href: "/validacion/eventos?tab=hechos-relevantes",
    iconKey: "chart",
    accent: "cyan",
    order: 25,
    hidden: true,
  },
  prevencion_lavado: {
    href: "/gestion/dashboard_plaft",
    iconKey: "layers",
    accent: "violet",
    order: 30,
  },
  gobierno_ia: {
    href: "/gestion/dashboard_gob_ia",
    iconKey: "activity",
    accent: "blue",
    order: 40,
  },
  ciberseguridad: {
    href: "/gestion/dashboard_ciberseguridad",
    iconKey: "flask",
    accent: "violet",
    order: 50,
  },
  continuidad_negocios: {
    href: "/gestion/dashboard_continuidad_negocios",
    iconKey: "pulse",
    accent: "blue",
    order: 60,
  },
  kiriox_academy: {
    href: "/validacion/eventos?tab=hechos-relevantes",
    iconKey: "alert",
    accent: "violet",
    order: 70,
  },
  kiriox_risk_average: {
    href: "/gestion/dashboard_reportes",
    iconKey: "file",
    accent: "violet",
    order: 80,
  },
  kiriox_enterprise_marketplace: {
    href: "/gestion/dashboard_plugins",
    iconKey: "puzzle",
    accent: "cyan",
    order: 90,
  },
  security: {
    href: "/admin",
    iconKey: "shield",
    accent: "violet",
    order: 95,
    adminOnly: true,
  },
};

/** Tarjetas fijas que siempre aparecen en el launchpad, no dependen de security_system. */
const STATIC_CARDS: EnterpriseLaunchpadCard[] = [
  {
    id: "static-prevencion-fraudes",
    systemCode: "prevencion_fraudes",
    title: "Prevención de fraudes",
    description: "Analizando los micro riesgos que se convierten en grandes consecuencias.",
    href: "/gestion/structural-map",
    iconKey: "shield",
    accent: "cyan",
    order: 35,
  },
];

export function buildEnterpriseLaunchpadCards(
  systems: SecuritySystemSummary[],
  enabledSystems: string[],
  options?: { includeAdminOnly?: boolean },
): EnterpriseLaunchpadCard[] {
  const enabledSet = new Set(enabledSystems);

  const dynamicCards = systems
    .filter((system) => enabledSet.has(system.code))
    .filter((system) => !(SYSTEM_PRESENTATION[system.code]?.hidden ?? false))
    .filter((system) => {
      const adminOnly = SYSTEM_PRESENTATION[system.code]?.adminOnly ?? false;
      return options?.includeAdminOnly ? true : !adminOnly;
    })
    .map((system) => {
      const presentation = SYSTEM_PRESENTATION[system.code];
      return {
        id: system.id,
        systemCode: system.code,
        title: system.name,
        description: system.description?.trim() || presentation?.description || `Sistema ${system.name}.`,
        href: presentation?.href ?? "/main_dashboard",
        iconKey: presentation?.iconKey ?? "layout",
        accent: presentation?.accent ?? "blue",
        order: presentation?.order ?? 999,
      };
    });

  return [...dynamicCards, ...STATIC_CARDS].sort((left, right) => left.order - right.order);
}

import type { KirioxModuleContract, KirioxOfficialModuleId } from "@/shared/contracts/modules/module.contract";
import type { NavItem } from "@/shared/types";

export type EnterpriseLaunchpadCard = {
  id: string;
  moduleId: KirioxOfficialModuleId;
  title: string;
  description: string;
  href: string;
  iconKey: string;
  accent: "blue" | "violet" | "cyan";
  order: number;
};

type CardPresentation = {
  title: string;
  description: string;
  href?: string;
  iconKey: string;
  accent: "blue" | "violet" | "cyan";
  order: number;
};

const CARD_PRESENTATION: Partial<Record<KirioxOfficialModuleId, CardPresentation>> = {
  "structural-risk": {
    title: "Gestion de riesgo",
    description: "Identifique, visualice y gestione la exposicion integral de riesgo de su organizacion.",
    href: "/score/dashboard2",
    iconKey: "shield",
    accent: "blue",
    order: 10,
  },
  "company": {
    title: "Gobierno de Auditoría",
    description: "Planifique, ejecute y supervise auditorías internas con trazabilidad, hallazgos y planes de acción.",
    href: "/gestion/dashboard_auditoria",
    iconKey: "building",
    accent: "blue",
    order: 20,
  },
  "incident": {
    title: "Análisis preventivo",
    description: "Anticipe incidentes, identifique patrones de riesgo y active controles preventivos antes de que ocurra la falla.",
    href: "/incident/dashboard",
    iconKey: "chart",
    accent: "cyan",
    order: 25,
  },
  "catalog": {
    title: "Plaft",
    description: "Gestione el cumplimiento en prevención de lavado de activos y financiamiento del terrorismo con trazabilidad regulatoria.",
    href: "/gestion/dashboard_plaft",
    iconKey: "layers",
    accent: "violet",
    order: 30,
  },
  "linear-risk": {
    title: "Gobierno de IA",
    description: "Supervise el uso ético, seguro y responsable de la inteligencia artificial en la organización.",
    iconKey: "activity",
    accent: "blue",
    order: 40,
  },
  "simulation": {
    title: "Ciberseguridad",
    description: "Identifique vulnerabilidades, simule ataques y gestione la postura de seguridad digital de la organización.",
    iconKey: "flask",
    accent: "violet",
    order: 50,
  },
  "monitoring": {
    title: "Continuidad de negocios",
    description: "Diseñe, pruebe y active planes de continuidad para garantizar la resiliencia operativa ante interrupciones.",
    iconKey: "pulse",
    accent: "blue",
    order: 60,
  },
  "hechos-relevantes": {
    title: "Kiriox Academy",
    description: "Acceda a formación especializada en gestión de riesgos, cumplimiento y gobierno para equipos y directivos.",
    iconKey: "alert",
    accent: "violet",
    order: 70,
  },
  "reportes": {
    title: "Kiriox Risk Average",
    description: "Consulte el índice consolidado de exposición al riesgo de su organización con métricas comparativas del sector.",
    iconKey: "file",
    accent: "violet",
    order: 80,
  },
  "plugins": {
    title: "Kiriox Enterprise Marketplace",
    description: "Descubra, instale y gestione extensiones certificadas para expandir las capacidades del ecosistema Kiriox.",
    iconKey: "puzzle",
    accent: "cyan",
    order: 90,
  },
};

export function buildEnterpriseLaunchpadCards(
  modules: KirioxModuleContract[],
  navigation: NavItem[],
): EnterpriseLaunchpadCard[] {
  const navByModule = new Map(navigation.map((item) => [item.module, item]));

  return modules
    .filter((moduleEntry) => moduleEntry.manifest.id !== "core")
    .filter((moduleEntry) => navByModule.has(moduleEntry.manifest.id))
    .map((moduleEntry) => {
      const navItem = navByModule.get(moduleEntry.manifest.id)!;
      const presentation = CARD_PRESENTATION[moduleEntry.manifest.id];

      return {
        id: moduleEntry.manifest.id,
        moduleId: moduleEntry.manifest.id,
        title: presentation?.title ?? navItem.label,
        description: presentation?.description ?? moduleEntry.manifest.description ?? navItem.label,
        href: presentation?.href ?? navItem.href ?? "/main_dashboard",
        iconKey: presentation?.iconKey ?? "layout",
        accent: presentation?.accent ?? "blue",
        order: presentation?.order ?? navItem.order,
      };
    })
    .sort((left, right) => left.order - right.order);
}

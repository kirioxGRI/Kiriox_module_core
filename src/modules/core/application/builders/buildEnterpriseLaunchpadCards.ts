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
    title: "Gobierno corporativo",
    description: "Administre la empresa, su contexto operativo y la estructura base del sistema.",
    iconKey: "building",
    accent: "blue",
    order: 20,
  },
  "catalog": {
    title: "Catalogos y modelos",
    description: "Gestione catalogos maestros, escalas y parametros de gobierno para todo Kiriox.",
    iconKey: "layers",
    accent: "violet",
    order: 30,
  },
  "linear-risk": {
    title: "Riesgo lineal",
    description: "Ejecute evaluaciones lineales, valoraciones y planes de tratamiento con trazabilidad.",
    iconKey: "activity",
    accent: "blue",
    order: 40,
  },
  "simulation": {
    title: "Simulaciones",
    description: "Modele escenarios, estres y corridas cuantitativas para apoyar decisiones ejecutivas.",
    iconKey: "flask",
    accent: "violet",
    order: 50,
  },
  "monitoring": {
    title: "Monitoreo ejecutivo",
    description: "Supervise riesgos, controles, pruebas y evidencias desde una capa consolidada.",
    iconKey: "pulse",
    accent: "blue",
    order: 60,
  },
  "hechos-relevantes": {
    title: "Incidentes",
    description: "Detecte, registre y de seguimiento a eventos relevantes que afecten a la organizacion.",
    iconKey: "alert",
    accent: "violet",
    order: 70,
  },
  "reportes": {
    title: "Reportes",
    description: "Centralice la gestion de entregables, reportes regulatorios y salidas ejecutivas.",
    iconKey: "file",
    accent: "violet",
    order: 80,
  },
  "plugins": {
    title: "Marketplace y extensiones",
    description: "Descubra e instale capacidades adicionales para expandir el ecosistema Kiriox.",
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

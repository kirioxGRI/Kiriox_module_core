import type { KirioxModuleContract } from "@/shared/contracts/modules/module.contract";

export const linearRiskModule: KirioxModuleContract = {
  manifest: {
    id: "linear-risk",
    family: "risk",
    backgroundColor: "#182f62",
    name: "Linear Risk",
    version: "0.1.0",
    description: "Módulo de gestión y evaluación de riesgo lineal de Kiriox.",
    status: "active",
    layers: ["domain", "application", "infrastructure", "api", "ui"],
    dependencies: ["core"],
    nav: {
      label: "Riesgo lineal",
      href: "/gestion/dashboard_riesgo_lineal",
      icon: "Activity",
      order: 20,
      permission: "linear-risk.read",
    },
  },

  register() {
    return;
  },

  activate() {
    return;
  },
};

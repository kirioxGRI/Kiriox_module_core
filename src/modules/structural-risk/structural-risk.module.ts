import type { KirioxModuleContract } from "@/shared/contracts/modules/module.contract";

export const structuralRiskModule: KirioxModuleContract = {
  manifest: {
    id: "structural-risk",
    family: "risk",
    backgroundColor: "#182f62",
    name: "Structural Risk",
    version: "0.1.0",
    description: "Módulo de captura, análisis y visualización de riesgo estructural por grafos.",
    status: "active",
    layers: ["domain", "application", "infrastructure", "api", "ui"],
    dependencies: ["core", "linear-risk"],
    nav: {
      label: "Riesgo estructural",
      href: "/gestion/dashboard_riesgo_estructural",
      icon: "Network",
      order: 30,
    },
  },

  register() {
    return;
  },

  activate() {
    return;
  },
};

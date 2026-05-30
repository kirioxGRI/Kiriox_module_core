import type { KirioxModuleContract } from "@/shared/contracts/modules/module.contract";

export const incidentModule: KirioxModuleContract = {
  manifest: {
    id: "incident",
    family: "platform",
    backgroundColor: "#182f62",
    name: "Incident",
    version: "0.1.0",
    description: "Módulo de análisis preventivo e incidentes de Kiriox.",
    status: "active",
    layers: ["domain", "application", "infrastructure", "api", "ui"],
    dependencies: ["core"],
    nav: {
      label: "Análisis preventivo",
      href: "/incident/dashboard",
      icon: "TriangleAlert",
      order: 24,
      permission: "A",
    },
  },

  register() {
    return;
  },

  activate() {
    return;
  },
};

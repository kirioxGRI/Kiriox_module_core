import type { KirioxModuleContract } from "@/shared/contracts/modules/module.contract";

export const simulationModule: KirioxModuleContract = {
  manifest: {
    id: "simulation",
    family: "risk",
    backgroundColor: "#182f62",
    name: "Simulation",
    version: "0.1.0",
    description: "Módulo de simulaciones lineales y probabilísticas de Kiriox.",
    status: "active",
    layers: ["ui"],
    dependencies: ["core"],
    nav: {
      label: "Simulaciones",
      href: "/gestion/dashboard_simulaciones",
      icon: "FlaskConical",
      order: 40,
      permission: "simulation.read",
    },
  },

  register() {
    return;
  },

  activate() {
    return;
  },
};

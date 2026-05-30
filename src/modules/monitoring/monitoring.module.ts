import type { KirioxModuleContract } from "@/shared/contracts/modules/module.contract";

export const monitoringModule: KirioxModuleContract = {
  manifest: {
    id: "monitoring",
    family: "risk",
    backgroundColor: "#182f62",
    name: "Monitoreo Ejecutivo",
    version: "0.1.0",
    description: "Dashboard ejecutivo de monitoreo de riesgos, controles, pruebas y evidencias.",
    status: "active",
    layers: ["domain", "application", "infrastructure", "api", "ui"],
    dependencies: ["core"],
    nav: {
      label: "Monitoreo",
      href: "/gestion/dashboard_monitoreo",
      icon: "Activity",
      order: 65,
      permission: "monitoring.read",
    },
  },

  register() {
    return;
  },

  activate() {
    return;
  },
};

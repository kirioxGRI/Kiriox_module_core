import type { KirioxModuleContract } from "@/shared/contracts/modules/module.contract";

export const reportesModule: KirioxModuleContract = {
  manifest: {
    id: "reportes",
    family: "risk",
    backgroundColor: "#182f62",
    name: "Reportes",
    version: "0.1.0",
    description: "Gestión y seguimiento de reportes regulatorios de la AFI.",
    status: "active",
    layers: ["domain", "application", "infrastructure", "api", "ui"],
    dependencies: ["core"],
    nav: {
      label: "Reportes",
      href: "/gestion/dashboard_reportes",
      icon: "FileText",
      order: 80,
      permission: "reportes.read",
    },
  },

  register() {
    return;
  },

  activate() {
    return;
  },
};

import type { KirioxModuleContract } from "@/shared/contracts/modules/module.contract";

export const pluginsModule: KirioxModuleContract = {
  manifest: {
    id: "plugins",
    family: "marketplace",
    backgroundColor: "#182f62",
    name: "Plugins",
    version: "0.1.0",
    description: "Gestión y administración de extensiones y plugins del sistema.",
    status: "active",
    layers: ["application", "infrastructure", "ui"],
    dependencies: ["core"],
    nav: {
      label: "Extensiones",
      href: "/gestion/dashboard_plugins",
      icon: "Puzzle",
      order: 90,
      permission: "plugins.read",
    },
  },

  register() {
    return;
  },

  activate() {
    return;
  },
};

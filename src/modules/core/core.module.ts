import type { KirioxModuleContract } from "@/shared/contracts/modules/module.contract";

export const coreModule: KirioxModuleContract = {
  manifest: {
    id: "core",
    name: "Core",
    version: "0.1.0",
    description: "Módulo base principal de Kiriox.",
    status: "active",
    layers: ["domain", "application", "infrastructure", "api", "ui"],
    dependencies: [],
    nav: {
      label: "Dashboard",
      href: "/main_dashboard",
      icon: "LayoutDashboard",
      order: 10,
    },
  },

  register() {
    return;
  },

  activate() {
    return;
  },
};

import type { KirioxModuleContract } from "@/shared/contracts/modules/module.contract";

export const coreModule: KirioxModuleContract = {
  manifest: {
    id: "core",
    family: "platform",
    name: "Core",
    version: "0.1.0",
    description: "Módulo base principal de Kiriox.",
    status: "active",
    layers: ["domain", "application", "infrastructure", "api", "ui"],
    dependencies: [],
    nav: {
      label: "Inicio",
      href: "/score/dashboard2",
      icon: "Home",
      order: 10,
      permission: "core.read",
    },
  },

  register() {
    return;
  },

  activate() {
    return;
  },
};

import type { KirioxModuleContract } from "@/shared/contracts/modules/module.contract";

export const catalogModule: KirioxModuleContract = {
  manifest: {
    id: "catalog",
    family: "risk",
    backgroundColor: "#182f62",
    name: "Catalog",
    version: "0.1.0",
    description: "Módulo de catálogos de gobernanza de Kiriox.",
    status: "active",
    layers: ["domain", "application", "infrastructure", "api", "ui"],
    dependencies: ["core"],
    nav: {
      label: "Configurar",
      href: "/modelo/gobernanza/catalogo",
      icon: "BookOpen",
      order: 11,
    },
  },

  register() {
    return;
  },

  activate() {
    return;
  },
};

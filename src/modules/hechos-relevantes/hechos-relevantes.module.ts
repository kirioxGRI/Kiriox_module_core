import type { KirioxModuleContract } from "@/shared/contracts/modules/module.contract";

export const hechosRelevantesModule: KirioxModuleContract = {
  manifest: {
    id: "hechos-relevantes",
    family: "risk",
    backgroundColor: "#182f62",
    name: "Hechos Relevantes",
    version: "0.1.0",
    description: "Captura y monitoreo de hechos relevantes del mercado de valores dominicano usando búsqueda pública (Brave Search).",
    status: "active",
    layers: ["domain", "application", "infrastructure", "api", "ui"],
    dependencies: ["core"],
    nav: {
      label: "Incidentes",
      href: "/validacion/eventos?tab=hechos-relevantes",
      icon: "Bot",
      order: 66,
    },
  },
  register() { return; },
  activate() { return; },
};

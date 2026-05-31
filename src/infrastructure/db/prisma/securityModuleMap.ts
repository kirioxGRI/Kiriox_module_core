import type { ModuleCode } from "@/shared/types";

/**
 * Maps security_module.code (DB layer) → application ModuleCode[] (feature-gate layer).
 * One security module can enable multiple app modules (e.g. "eventos" enables incident + hechos-relevantes).
 * New security codes that have no app module yet map to [].
 */
export const SECURITY_CODE_TO_APP_MODULES: Readonly<Record<string, ModuleCode[]>> = {
  configuraciones:           ["catalog"],
  riesgo_lineal:             ["linear-risk"],
  riesgo_estructural:        ["structural-risk"],
  simulaciones:              ["simulation"],
  monitoreo:                 ["monitoring"],
  reportes:                  ["reportes"],
  auditorias:                ["company"],
  eventos:                   ["incident"],
  extensions:                ["plugins"],
  academy:                   ["hechos-relevantes"],
  seguridad:                 [],
  auditoria_tic:             [],
  auditoria_continua:        [],
  auditoria_ciberseguridad:  [],
};

export function resolveAppModuleCodes(securityCode: string): ModuleCode[] {
  const mapped = SECURITY_CODE_TO_APP_MODULES[securityCode];
  if (mapped !== undefined) return mapped;
  return [];
}

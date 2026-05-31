"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SECURITY_CODE_TO_APP_MODULES = void 0;
exports.resolveAppModuleCodes = resolveAppModuleCodes;
/**
 * Maps security_module.code (DB layer) → application ModuleCode[] (feature-gate layer).
 * One security module can enable multiple app modules (e.g. "eventos" enables incident + hechos-relevantes).
 * New security codes that have no app module yet map to [].
 */
exports.SECURITY_CODE_TO_APP_MODULES = {
    configuraciones: ["catalog"],
    riesgo_lineal: ["linear-risk"],
    riesgo_estructural: ["structural-risk"],
    simulaciones: ["simulation"],
    monitoreo: ["monitoring"],
    reportes: ["reportes"],
    auditorias: ["company"],
    eventos: ["incident"],
    extensions: ["plugins"],
    academy: ["hechos-relevantes"],
    seguridad: [],
    auditoria_tic: [],
    auditoria_continua: [],
    auditoria_ciberseguridad: [],
};
function resolveAppModuleCodes(securityCode) {
    const mapped = exports.SECURITY_CODE_TO_APP_MODULES[securityCode];
    if (mapped !== undefined)
        return mapped;
    return [];
}

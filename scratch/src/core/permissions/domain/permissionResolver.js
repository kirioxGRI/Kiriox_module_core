"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOfficialModuleCodes = getOfficialModuleCodes;
exports.createEmptyModuleAccessFlags = createEmptyModuleAccessFlags;
exports.isAccessPermissionCode = isAccessPermissionCode;
exports.normalizeAccessPermissionCode = normalizeAccessPermissionCode;
exports.hasModulePermission = hasModulePermission;
exports.resolveEnabledModulesFromAccess = resolveEnabledModulesFromAccess;
const OFFICIAL_MODULE_CODES = [
    "core",
    "catalog",
    "company",
    "incident",
    "linear-risk",
    "structural-risk",
    "simulation",
    "monitoring",
    "hechos-relevantes",
    "reportes",
    "plugins",
];
const ACCESS_PERMISSION_CODES = ["A", "R", "W", "X"];
const LEGACY_PERMISSION_MAP = {
    access: "A",
    read: "R",
    write: "W",
    execute: "X",
    run: "X",
    "risk.structural.read": "R",
    "risk.structural.write": "W",
    "risk.structural.run": "X",
    "structural-risk.read": "R",
    "structural-risk.write": "W",
    "structural-risk.run": "X",
    "linear-risk.read": "R",
    "linear-risk.write": "W",
    "linear-risk.run": "X",
};
function getOfficialModuleCodes() {
    return [...OFFICIAL_MODULE_CODES];
}
function createEmptyModuleAccessFlags() {
    return { A: false, R: false, W: false, X: false };
}
function isAccessPermissionCode(value) {
    return ACCESS_PERMISSION_CODES.includes(value);
}
function normalizeAccessPermissionCode(permission) {
    const trimmed = permission.trim();
    if (isAccessPermissionCode(trimmed))
        return trimmed;
    const normalized = LEGACY_PERMISSION_MAP[trimmed];
    if (normalized)
        return normalized;
    throw new Error(`Unsupported access permission code: ${permission}`);
}
function hasModulePermission(moduleAccess, moduleCode, permission) {
    return Boolean(moduleAccess[moduleCode]?.permissions[permission]);
}
function resolveEnabledModulesFromAccess(moduleAccess) {
    return OFFICIAL_MODULE_CODES.filter((moduleCode) => Boolean(moduleAccess[moduleCode]?.permissions.A));
}

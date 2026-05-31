import type { AccessPermissionCode, ModuleAccessEntry, ModuleCode, SystemAccessEntry } from "@/shared/types";

const OFFICIAL_MODULE_CODES: ModuleCode[] = [
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

const ACCESS_PERMISSION_CODES: AccessPermissionCode[] = ["A", "R", "W", "X"];

const LEGACY_PERMISSION_MAP: Record<string, AccessPermissionCode> = {
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

export function getOfficialModuleCodes(): ModuleCode[] {
  return [...OFFICIAL_MODULE_CODES];
}

export function createEmptyModuleAccessFlags(): Record<AccessPermissionCode, boolean> {
  return { A: false, R: false, W: false, X: false };
}

export function isAccessPermissionCode(value: string): value is AccessPermissionCode {
  return ACCESS_PERMISSION_CODES.includes(value as AccessPermissionCode);
}

export function normalizeAccessPermissionCode(
  permission: string,
): AccessPermissionCode {
  const trimmed = permission.trim();
  if (isAccessPermissionCode(trimmed)) return trimmed;

  const normalized = LEGACY_PERMISSION_MAP[trimmed];
  if (normalized) return normalized;

  throw new Error(`Unsupported access permission code: ${permission}`);
}

export function hasModulePermission(
  moduleAccess: Partial<Record<ModuleCode, ModuleAccessEntry>>,
  moduleCode: ModuleCode,
  permission: AccessPermissionCode,
): boolean {
  return Boolean(moduleAccess[moduleCode]?.permissions[permission]);
}

export function hasSystemPermission(
  systemAccess: Partial<Record<string, SystemAccessEntry>>,
  systemCode: string,
  permission: AccessPermissionCode,
): boolean {
  return Boolean(systemAccess[systemCode]?.permissions[permission]);
}

export function resolveEnabledModulesFromAccess(
  moduleAccess: Partial<Record<ModuleCode, ModuleAccessEntry>>,
): ModuleCode[] {
  return OFFICIAL_MODULE_CODES.filter((moduleCode) =>
    Boolean(moduleAccess[moduleCode]?.permissions.A),
  );
}

export function resolveEnabledSystemsFromAccess(
  systemAccess: Partial<Record<string, SystemAccessEntry>>,
): string[] {
  return Object.entries(systemAccess)
    .filter(([, entry]) => Boolean(entry?.permissions.A))
    .map(([systemCode]) => systemCode)
    .sort((left, right) => left.localeCompare(right));
}

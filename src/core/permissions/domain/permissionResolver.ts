import type { ModuleCode } from "@/shared/types";

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

const PERMISSION_ALIASES: Record<string, string[]> = {
  "core.read": ["core.read", "core.dashboard.read"],
  "catalog.read": ["catalog.read"],
  "catalog.write": ["catalog.write"],
  "company.read": ["company.read"],
  "company.write": ["company.write"],
  "incident.read": ["incident.read"],
  "incident.write": ["incident.write"],
  "linear-risk.read": ["linear-risk.read", "risk.linear.read"],
  "linear-risk.write": ["linear-risk.write", "risk.linear.run"],
  "linear-risk.run": ["linear-risk.run", "risk.linear.run"],
  "structural-risk.read": ["structural-risk.read", "risk.structural.read"],
  "structural-risk.write": ["structural-risk.write", "risk.structural.write"],
  "structural-risk.run": ["structural-risk.run", "risk.structural.run"],
  "simulation.read": ["simulation.read"],
  "simulation.write": ["simulation.write"],
  "simulation.run": ["simulation.run"],
  "monitoring.read": ["monitoring.read"],
  "monitoring.write": ["monitoring.write"],
  "hechos-relevantes.read": ["hechos-relevantes.read"],
  "hechos-relevantes.write": ["hechos-relevantes.write"],
  "reportes.read": ["reportes.read"],
  "reportes.write": ["reportes.write"],
  "plugins.read": ["plugins.read"],
  "plugins.write": ["plugins.write"],
};

const ALIAS_LOOKUP = new Map<string, string[]>();

for (const aliases of Object.values(PERMISSION_ALIASES)) {
  for (const alias of aliases) {
    ALIAS_LOOKUP.set(alias, aliases);
  }
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function extractModuleFromPermission(permissionCode: string): ModuleCode | null {
  if (permissionCode.startsWith("risk.linear.")) return "linear-risk";
  if (permissionCode.startsWith("risk.structural.")) return "structural-risk";
  if (permissionCode.startsWith("core.")) return "core";

  for (const moduleCode of OFFICIAL_MODULE_CODES) {
    if (permissionCode === moduleCode) return moduleCode;
    if (permissionCode.startsWith(`${moduleCode}.`)) return moduleCode;
  }

  return null;
}

export function getOfficialModuleCodes(): ModuleCode[] {
  return [...OFFICIAL_MODULE_CODES];
}

export function normalizePermissionCode(
  moduleCode: ModuleCode,
  permission: string,
): string {
  const trimmed = permission.trim();
  if (!trimmed) return `${moduleCode}.read`;
  if (trimmed.includes(".")) return trimmed;
  return `${moduleCode}.${trimmed}`;
}

export function resolvePermissionAliases(permissionCode: string): string[] {
  const normalized = permissionCode.trim();
  if (!normalized) return [];
  return dedupe(ALIAS_LOOKUP.get(normalized) ?? [normalized]);
}

export function hasAssignedPermission(
  assignedPermissions: string[],
  requiredPermission?: string,
): boolean {
  if (!requiredPermission) return true;

  const assigned = new Set(assignedPermissions.filter(Boolean));
  if (assigned.has("*")) return true;

  const aliases = resolvePermissionAliases(requiredPermission);

  for (const alias of aliases) {
    if (assigned.has(alias)) return true;

    const lastDotIndex = alias.lastIndexOf(".");
    if (lastDotIndex !== -1) {
      const wildcard = `${alias.slice(0, lastDotIndex)}.*`;
      if (assigned.has(wildcard)) return true;
    }
  }

  return false;
}

export function resolveModulesFromPermissions(
  permissions: string[],
): ModuleCode[] {
  if (permissions.includes("*")) {
    return getOfficialModuleCodes();
  }

  const modules = new Set<ModuleCode>(["core"]);

  for (const permission of permissions) {
    const aliases = resolvePermissionAliases(permission);
    for (const alias of aliases) {
      const moduleCode = extractModuleFromPermission(alias);
      if (moduleCode) {
        modules.add(moduleCode);
      }
    }
  }

  return OFFICIAL_MODULE_CODES.filter((moduleCode) => modules.has(moduleCode));
}

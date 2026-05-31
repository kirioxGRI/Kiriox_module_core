import prisma from '@/infrastructure/db/prisma/client';
import { resolveEffectiveCompanyId } from '@/infrastructure/db/prisma/resolveEffectiveCompanyId';
import { resolveAppModuleCodes } from '@/infrastructure/db/prisma/securityModuleMap';
import { isDevAuthBypassEnabled } from '@/core/auth/auth-server';
import { buildNavigation } from '@/core/navigation/buildNavigation';
import {
  createEmptyModuleAccessFlags,
  hasModulePermission,
  resolveEnabledModulesFromAccess,
  resolveEnabledSystemsFromAccess,
} from '../domain';
import type { AccessControlRepository } from '../domain/contracts/AccessControlRepository';
import type { AccessContextRepository } from '../domain/contracts/AccessContextRepository';
import type {
  AccessContext,
  AccessPermissionCode,
  ModuleAccessEntry,
  ModuleCode,
  SystemAccessEntry,
} from '@/shared/types';

export class PrismaAccessContextRepository implements AccessContextRepository, AccessControlRepository {
  async getAccessContext(input: { userId: string; companyId: string; fallbackEmail?: string }): Promise<AccessContext> {
    const companyId = await resolveEffectiveCompanyId(input.companyId);

    const [user, company, companySystems, companyModules, roles] = await Promise.all([
      this.loadUser(input.userId, input.fallbackEmail),
      this.loadCompany(companyId),
      this.loadCompanySystems(companyId),
      this.getEnabledModules(companyId),
      this.loadActiveRoles(input.userId, companyId),
    ]);

    const moduleAccess = isDevAuthBypassEnabled()
      ? this.buildFullAccess(companyModules)
      : await this.loadModuleAccess(input.userId, companyId);
    const systemAccess = isDevAuthBypassEnabled()
      ? this.buildFullSystemAccess(companySystems)
      : await this.loadSystemAccess(input.userId, companyId);

    const enabledModules = resolveEnabledModulesFromAccess(moduleAccess)
      .filter((code) => companyModules.includes(code));
    const enabledSystems = resolveEnabledSystemsFromAccess(systemAccess)
      .filter((code) => companySystems.some((system) => system.code === code));
    const navigation = buildNavigation({ enabledModules });

    return {
      user,
      company,
      roles,
      companySystems,
      companyModules,
      moduleAccess,
      systemAccess,
      enabledSystems,
      enabledModules,
      navigation,
    };
  }

  async getEnabledModules(companyId: string): Promise<ModuleCode[]> {
    const effectiveCompanyId = await resolveEffectiveCompanyId(companyId);

    const modules = await prisma.security_module.findMany({
      where: { company_id: effectiveCompanyId, is_active: true },
      select: { code: true },
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });

    const enabled = new Set<ModuleCode>(['core']);
    for (const mod of modules) {
      for (const appCode of resolveAppModuleCodes(mod.code.trim())) {
        enabled.add(appCode);
      }
    }
    return Array.from(enabled);
  }

  async userBelongsToCompany(userId: string, companyId: string): Promise<boolean> {
    const effectiveCompanyId = await resolveEffectiveCompanyId(companyId);
    const found = await prisma.security_users.findFirst({
      where: { id: userId, company_id: effectiveCompanyId, is_active: { not: false } },
      select: { id: true },
    });
    return found !== null;
  }

  async isModuleEnabled(companyId: string, moduleCode: ModuleCode): Promise<boolean> {
    const enabledModules = await this.getEnabledModules(companyId);
    return enabledModules.includes(moduleCode);
  }

  async hasPermission(
    userId: string,
    companyId: string,
    moduleCode: ModuleCode,
    permission: AccessPermissionCode,
  ): Promise<boolean> {
    if (isDevAuthBypassEnabled()) return true;
    const effectiveCompanyId = await resolveEffectiveCompanyId(companyId);
    const moduleAccess = await this.loadModuleAccess(userId, effectiveCompanyId);
    return hasModulePermission(moduleAccess, moduleCode, permission);
  }

  private async loadUser(userId: string, fallbackEmail?: string) {
    const user = await prisma.security_users.findUnique({
      where: { id: userId },
      select: { id: true, username: true, name: true, last_name: true, email: true },
    });

    const displayName =
      [user?.name, user?.last_name].filter((v) => v?.trim()).join(' ').trim() ||
      user?.username ||
      fallbackEmail ||
      'Usuario';

    return {
      id: userId,
      name: displayName,
      email: user?.email ?? fallbackEmail ?? '',
    };
  }

  private async loadCompany(companyId: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, code: true, name: true },
    });
    return { id: companyId, code: company?.code ?? '', name: company?.name ?? 'Empresa' };
  }

  private async loadCompanySystems(companyId: string) {
    return prisma.security_system.findMany({
      where: { company_id: companyId, is_active: true },
      select: { id: true, code: true, name: true, description: true },
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  }

  private async loadActiveRoles(userId: string, companyId: string) {
    const user = await prisma.security_users.findFirst({
      where: { id: userId, company_id: companyId, is_active: { not: false } },
      select: {
        map_user_x_roles: {
          where: {
            is_active: true,
            security_roles: { is_active: true },
          },
          select: {
            security_roles: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    return (user?.map_user_x_roles ?? [])
      .map((mur) => ({
        id: mur.security_roles.id,
        code: mur.security_roles.code,
        name: mur.security_roles.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private async loadModuleAccess(
    userId: string,
    companyId: string,
  ): Promise<Partial<Record<ModuleCode, ModuleAccessEntry>>> {
    const user = await prisma.security_users.findFirst({
      where: { id: userId, company_id: companyId, is_active: { not: false } },
      select: {
        map_user_x_roles: {
          where: {
            is_active: true,
            security_roles: { is_active: true },
          },
          select: {
            security_roles: {
              select: {
                map_role_x_module_x_permissions: {
                  where: {
                    is_active: true,
                    security_module: { company_id: companyId, is_active: true },
                  },
                  select: {
                    security_module: { select: { id: true, code: true, name: true } },
                    security_permissions: { select: { code: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const moduleAccess: Partial<Record<ModuleCode, ModuleAccessEntry>> = {};

    for (const mur of user?.map_user_x_roles ?? []) {
      for (const mrmp of mur.security_roles.map_role_x_module_x_permissions) {
        const mod = mrmp.security_module;
        const permCode = mrmp.security_permissions.code as AccessPermissionCode;
        const securityCode = mod.code.trim();

        for (const appCode of resolveAppModuleCodes(securityCode)) {
          if (!moduleAccess[appCode]) {
            moduleAccess[appCode] = {
              moduleId: appCode,
              securityModuleId: mod.id,
              securityModuleCode: securityCode,
              name: mod.name,
              permissions: createEmptyModuleAccessFlags(),
            };
          }
          moduleAccess[appCode]!.permissions[permCode] = true;
        }
      }
    }

    return moduleAccess;
  }

  private async loadSystemAccess(
    userId: string,
    companyId: string,
  ): Promise<Partial<Record<string, SystemAccessEntry>>> {
    const user = await prisma.security_users.findFirst({
      where: { id: userId, company_id: companyId, is_active: { not: false } },
      select: {
        map_user_x_roles: {
          where: {
            is_active: true,
            security_roles: { is_active: true },
          },
          select: {
            security_roles: {
              select: {
                map_role_x_system_x_permissions: {
                  where: {
                    is_active: true,
                    security_system: { company_id: companyId, is_active: true },
                  },
                  select: {
                    security_system: { select: { id: true, code: true, name: true } },
                    security_permissions: { select: { code: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const systemAccess: Partial<Record<string, SystemAccessEntry>> = {};

    for (const mur of user?.map_user_x_roles ?? []) {
      for (const mrsp of mur.security_roles.map_role_x_system_x_permissions) {
        const system = mrsp.security_system;
        const permCode = mrsp.security_permissions.code as AccessPermissionCode;
        const systemCode = system.code.trim();

        if (!systemAccess[systemCode]) {
          systemAccess[systemCode] = {
            systemId: system.id,
            systemCode,
            name: system.name,
            permissions: createEmptyModuleAccessFlags(),
          };
        }

        systemAccess[systemCode]!.permissions[permCode] = true;
      }
    }

    return systemAccess;
  }

  private buildFullAccess(moduleCodes: ModuleCode[]): Partial<Record<ModuleCode, ModuleAccessEntry>> {
    const moduleAccess: Partial<Record<ModuleCode, ModuleAccessEntry>> = {};
    for (const moduleCode of moduleCodes) {
      moduleAccess[moduleCode] = {
        moduleId: moduleCode,
        securityModuleId: moduleCode,
        securityModuleCode: moduleCode,
        name: moduleCode,
        permissions: { A: true, R: true, W: true, X: true },
      };
    }
    return moduleAccess;
  }

  private buildFullSystemAccess(
    systems: Array<{ id: string; code: string; name: string }>,
  ): Partial<Record<string, SystemAccessEntry>> {
    const systemAccess: Partial<Record<string, SystemAccessEntry>> = {};
    for (const system of systems) {
      systemAccess[system.code] = {
        systemId: system.id,
        systemCode: system.code,
        name: system.name,
        permissions: { A: true, R: true, W: true, X: true },
      };
    }
    return systemAccess;
  }
}

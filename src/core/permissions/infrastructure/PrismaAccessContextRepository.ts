import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';
import { resolveEffectiveCompanyId } from '@/infrastructure/db/prisma/resolveEffectiveCompanyId';
import { resolveAppModuleCodes } from '@/infrastructure/db/prisma/securityModuleMap';
import { isDevAuthBypassEnabled } from '@/core/auth/auth-server';
import { buildNavigation } from '@/core/navigation/buildNavigation';
import {
  createEmptyModuleAccessFlags,
  hasModulePermission,
  resolveEnabledModulesFromAccess,
} from '../domain';
import type { AccessControlRepository } from '../domain/contracts/AccessControlRepository';
import type { AccessContextRepository } from '../domain/contracts/AccessContextRepository';
import type {
  AccessContext,
  AccessPermissionCode,
  ModuleAccessEntry,
  ModuleCode,
} from '@/shared/types';

function isMissingRelation(error: unknown, table: string): boolean {
  return String((error as { message?: string })?.message ?? '').includes(`relation "${table}" does not exist`);
}

type RoleRow = { id: string; code: string; name: string };
type ModuleRow = { id: string; code: string; name: string };
type ModulePermissionRow = {
  role_id: string;
  role_code: string;
  module_id: string;
  module_code: string;
  module_name: string;
  permission_code: AccessPermissionCode;
};

export class PrismaAccessContextRepository implements AccessContextRepository, AccessControlRepository {
  async getAccessContext(input: { userId: string; companyId: string; fallbackEmail?: string }): Promise<AccessContext> {
    const companyId = await resolveEffectiveCompanyId(input.companyId);
    const [user, company, companyModules, roles] = await Promise.all([
      this.loadUser(input.userId, input.fallbackEmail),
      this.loadCompany(companyId),
      this.getEnabledModules(companyId),
      this.loadActiveRoles(input.userId, companyId),
    ]);

    const moduleAccess = isDevAuthBypassEnabled()
      ? this.buildFullAccess(companyModules)
      : await this.loadModuleAccess(input.userId, companyId);

    const enabledModules = resolveEnabledModulesFromAccess(moduleAccess)
      .filter((moduleCode) => companyModules.includes(moduleCode));
    const navigation = buildNavigation({ enabledModules });

    return {
      user,
      company,
      roles,
      companyModules,
      moduleAccess,
      enabledModules,
      navigation,
    };
  }

  async getEnabledModules(companyId: string): Promise<ModuleCode[]> {
    const effectiveCompanyId = await resolveEffectiveCompanyId(companyId);
    type Row = { code: string };

    try {
      const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT sm.code
        FROM public.security_module sm
        WHERE sm.company_id = ${effectiveCompanyId}::uuid
          AND sm.is_active = true
        ORDER BY sm.name ASC, sm.code ASC
      `);

      const enabled = new Set<ModuleCode>(["core"]);
      for (const row of rows) {
        for (const appCode of resolveAppModuleCodes(row.code.trim())) {
          enabled.add(appCode);
        }
      }
      return Array.from(enabled);
    } catch (err) {
      if (isMissingRelation(err, 'public.security_module')) return [];
      throw err;
    }
  }

  async userBelongsToCompany(userId: string, companyId: string): Promise<boolean> {
    const effectiveCompanyId = await resolveEffectiveCompanyId(companyId);
    type Row = { exists: boolean };

    try {
      const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT EXISTS (
          SELECT 1
          FROM public.security_users u
          WHERE u.id = ${userId}::uuid
            AND u.company_id = ${effectiveCompanyId}::uuid
            AND COALESCE(u.is_active, true) = true
        ) AS exists
      `);

      return Boolean(rows[0]?.exists);
    } catch (err) {
      if (isMissingRelation(err, 'public.security_users')) return false;
      throw err;
    }
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
    type Row = {
      id: string;
      username: string | null;
      name: string | null;
      last_name: string | null;
      email: string | null;
    };

    let rows: Row[] = [];
    try {
      rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT u.id, u.username, u.name, u.last_name, u.email
        FROM public.security_users u
        WHERE u.id = ${userId}::uuid
        LIMIT 1
      `);
    } catch (err) {
      if (!isMissingRelation(err, 'public.security_users')) throw err;
    }

    const row = rows[0];
    const displayName = [row?.name, row?.last_name]
      .filter((value) => Boolean(value && value.trim()))
      .join(' ')
      || row?.username
      || fallbackEmail
      || 'Usuario';

    return {
      id: userId,
      name: displayName,
      email: row?.email ?? fallbackEmail ?? '',
    };
  }

  private async loadCompany(companyId: string) {
    type Row = { id: string; code: string | null; name: string | null };
    let rows: Row[] = [];

    try {
      rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT c.id, c.code, c.name
        FROM public.company c
        WHERE c.id = ${companyId}::uuid
        LIMIT 1
      `);
    } catch (err) {
      if (!isMissingRelation(err, 'public.company')) throw err;
    }

    const row = rows[0];
    return { id: companyId, code: row?.code ?? '', name: row?.name ?? 'Empresa' };
  }

  private async loadActiveRoles(userId: string, companyId: string): Promise<RoleRow[]> {
    try {
      const rows = await prisma.$queryRaw<RoleRow[]>(Prisma.sql`
        SELECT DISTINCT r.id::text AS id, r.code, r.name
        FROM public.security_users u
        JOIN public.map_user_x_roles mur
          ON mur.user_id = u.id
         AND COALESCE(mur.is_active, true) = true
        JOIN public.security_roles r
          ON r.id = mur.role_id
         AND COALESCE(r.is_active, true) = true
        WHERE u.id = ${userId}::uuid
          AND u.company_id = ${companyId}::uuid
          AND COALESCE(u.is_active, true) = true
        ORDER BY r.name ASC, r.code ASC
      `);

      return rows;
    } catch (err) {
      if (isMissingRelation(err, 'public.map_user_x_roles')) return [];
      if (isMissingRelation(err, 'public.security_roles')) return [];
      throw err;
    }
  }

  private async loadModuleAccess(
    userId: string,
    companyId: string,
  ): Promise<Partial<Record<ModuleCode, ModuleAccessEntry>>> {
    try {
      const rows = await prisma.$queryRaw<ModulePermissionRow[]>(Prisma.sql`
        SELECT DISTINCT
          r.id::text AS role_id,
          r.code AS role_code,
          sm.id::text AS module_id,
          sm.code AS module_code,
          sm.name AS module_name,
          sp.code::text AS permission_code
        FROM public.security_users u
        JOIN public.map_user_x_roles mur
          ON mur.user_id = u.id
         AND COALESCE(mur.is_active, true) = true
        JOIN public.security_roles r
          ON r.id = mur.role_id
         AND COALESCE(r.is_active, true) = true
        JOIN public.map_role_x_module_x_permissions mrmp
          ON mrmp.role_id = r.id
         AND COALESCE(mrmp.is_active, true) = true
        JOIN public.security_module sm
          ON sm.id = mrmp.module_id
         AND sm.company_id = ${companyId}::uuid
         AND COALESCE(sm.is_active, true) = true
        JOIN public.security_permissions sp
          ON sp.id = mrmp.permission_id
         AND COALESCE(sp.is_active, true) = true
        WHERE u.id = ${userId}::uuid
          AND u.company_id = ${companyId}::uuid
          AND COALESCE(u.is_active, true) = true
        ORDER BY sm.name ASC, sm.code ASC
      `);

      const moduleAccess: Partial<Record<ModuleCode, ModuleAccessEntry>> = {};

      for (const row of rows) {
        const securityCode = row.module_code.trim();
        const appCodes = resolveAppModuleCodes(securityCode);

        for (const appCode of appCodes) {
          if (!moduleAccess[appCode]) {
            moduleAccess[appCode] = {
              moduleId: appCode,
              securityModuleId: row.module_id,
              securityModuleCode: securityCode,
              name: row.module_name,
              permissions: createEmptyModuleAccessFlags(),
            };
          }
          moduleAccess[appCode]!.permissions[row.permission_code as AccessPermissionCode] = true;
        }
      }

      return moduleAccess;
    } catch (err) {
      if (isMissingRelation(err, 'public.map_role_x_module_x_permissions')) return {};
      if (isMissingRelation(err, 'public.security_permissions')) return {};
      if (isMissingRelation(err, 'public.map_user_x_roles')) return {};
      if (isMissingRelation(err, 'public.security_roles')) return {};
      if (isMissingRelation(err, 'public.security_module')) return {};
      throw err;
    }
  }

  private buildFullAccess(
    moduleCodes: ModuleCode[],
  ): Partial<Record<ModuleCode, ModuleAccessEntry>> {
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
}

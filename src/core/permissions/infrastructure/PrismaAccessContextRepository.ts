import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';
import { resolveEffectiveCompanyId } from '@/infrastructure/db/prisma/resolveEffectiveCompanyId';
import { isDevAuthBypassEnabled } from '@/core/auth/auth-server';
import { buildNavigation } from '@/core/navigation/buildNavigation';
import {
  getOfficialModuleCodes,
  hasAssignedPermission,
  resolveModulesFromPermissions,
} from '../domain';
import type { AccessControlRepository } from '../domain/contracts/AccessControlRepository';
import type { AccessContextRepository } from '../domain/contracts/AccessContextRepository';
import type { AccessContext, ModuleCode } from '@/shared/types';

const COMPANY_ENABLED_MODULES = getOfficialModuleCodes();

function isMissingRelation(error: unknown, table: string): boolean {
  return String((error as { message?: string })?.message ?? '').includes(`relation "${table}" does not exist`);
}

export class PrismaAccessContextRepository implements AccessContextRepository, AccessControlRepository {
  async getAccessContext(input: { userId: string; companyId: string; fallbackEmail?: string }): Promise<AccessContext> {
    const companyId = await resolveEffectiveCompanyId(input.companyId);
    const [user, company, companyEnabledModules, permissions] = await Promise.all([
      this.loadUser(input.userId, input.fallbackEmail),
      this.loadCompany(companyId),
      this.getEnabledModules(companyId),
      this.getPermissions(input.userId, companyId),
    ]);

    const userEnabledModules = resolveModulesFromPermissions(permissions);
    const enabledModules = companyEnabledModules.filter((moduleCode) =>
      userEnabledModules.includes(moduleCode),
    );
    const navigation = buildNavigation({ enabledModules, permissions });

    return { user, company, enabledModules, permissions, navigation };
  }

  async getEnabledModules(companyId: string): Promise<ModuleCode[]> {
    void companyId;
    return [...COMPANY_ENABLED_MODULES];
  }

  async getPermissions(userId: string, companyId: string): Promise<string[]> {
    if (isDevAuthBypassEnabled()) return ['*'];

    const effectiveCompanyId = await resolveEffectiveCompanyId(companyId);
    const roleCodes = await this.loadActiveRoleCodes(userId, effectiveCompanyId);
    if (roleCodes.some((roleCode) => roleCode === 'super_admin')) {
      return ['*'];
    }

    return this.loadAssignedPermissionCodes(userId, effectiveCompanyId);
  }

  async userBelongsToCompany(userId: string, companyId: string): Promise<boolean> {
    const effectiveCompanyId = await resolveEffectiveCompanyId(companyId);
    type Row = { exists: boolean };

    try {
      const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = ${userId}::uuid
            AND u.company_id = ${effectiveCompanyId}::uuid
            AND COALESCE(u.is_active, true) = true
        ) AS exists
      `);

      return Boolean(rows[0]?.exists);
    } catch (err) {
      if (isMissingRelation(err, 'public.users')) return false;
      throw err;
    }
  }

  async isModuleEnabled(companyId: string, moduleCode: ModuleCode): Promise<boolean> {
    const enabledModules = await this.getEnabledModules(companyId);
    return enabledModules.includes(moduleCode);
  }

  async hasPermission(userId: string, companyId: string, permission: string): Promise<boolean> {
    const permissions = await this.getPermissions(userId, companyId);
    return hasAssignedPermission(permissions, permission);
  }

  private async loadUser(userId: string, fallbackEmail?: string) {
    type Row = { id: string; username: string | null; email: string | null };
    let rows: Row[] = [];
    try {
      rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT u.id, u.username, u.email
        FROM public.users u
        WHERE u.id = ${userId}::uuid
        LIMIT 1
      `);
    } catch (err) {
      if (!isMissingRelation(err, 'public.users')) throw err;
    }
    const row = rows[0];
    return { id: userId, name: row?.username ?? 'Usuario', email: row?.email ?? fallbackEmail ?? '' };
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

  private async loadActiveRoleCodes(userId: string, companyId: string): Promise<string[]> {
    type Row = { code: string };

    try {
      const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT DISTINCT r.code
        FROM public.users u
        JOIN public.map_users_x_roles mur
          ON mur.user_id = u.id
         AND COALESCE(mur.is_active, true) = true
        JOIN public.users_roles r
          ON r.id = mur.role_id
         AND COALESCE(r.is_active, true) = true
        WHERE u.id = ${userId}::uuid
          AND u.company_id = ${companyId}::uuid
          AND COALESCE(u.is_active, true) = true
      `);

      return rows
        .map((row) => row.code.trim().toLowerCase())
        .filter(Boolean);
    } catch (err) {
      if (isMissingRelation(err, 'public.map_users_x_roles')) return [];
      if (isMissingRelation(err, 'public.users_roles')) return [];
      throw err;
    }
  }

  private async loadAssignedPermissionCodes(userId: string, companyId: string): Promise<string[]> {
    type Row = { code: string };

    try {
      const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT DISTINCT p.code
        FROM public.users u
        JOIN public.map_users_x_roles mur
          ON mur.user_id = u.id
         AND COALESCE(mur.is_active, true) = true
        JOIN public.users_roles r
          ON r.id = mur.role_id
         AND COALESCE(r.is_active, true) = true
        JOIN public.map_role_x_permission mrp
          ON mrp.role_id = r.id
         AND COALESCE(mrp.is_active, true) = true
        JOIN public.users_permission p
          ON p.code = mrp.permission_code
         AND COALESCE(p.is_active, true) = true
        WHERE u.id = ${userId}::uuid
          AND u.company_id = ${companyId}::uuid
          AND COALESCE(u.is_active, true) = true
      `);

      return rows.map((row) => row.code);
    } catch (err) {
      if (isMissingRelation(err, 'public.map_role_x_permission')) return [];
      if (isMissingRelation(err, 'public.users_permission')) return [];
      if (isMissingRelation(err, 'public.map_users_x_roles')) return [];
      if (isMissingRelation(err, 'public.users_roles')) return [];
      throw err;
    }
  }
}

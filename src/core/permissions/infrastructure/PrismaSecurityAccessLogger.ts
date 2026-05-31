import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';
import type { AccessPermissionCode } from '@/shared/types';

type LogResult = 'allowed' | 'denied' | 'error';

type SecurityAccessLogInput = {
  userId: string;
  companyId: string;
  moduleCode: string;
  submoduleCode?: string;
  resourceType: string;
  resourceId?: string | null;
  actionCode: AccessPermissionCode;
  accessResult: LogResult;
  decisionReason: string;
  roleIds: string[];
  path: string;
  method: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

type SecurityToggleRow = {
  module_id: string | null;
  submodule_id: string | null;
  is_active: boolean | null;
};

type ResolvedModuleRow = {
  module_id: string | null;
  submodule_id: string | null;
};

function isMissingRelation(error: unknown, table: string): boolean {
  return String((error as { message?: string })?.message ?? '').includes(`relation "${table}" does not exist`);
}

export class PrismaSecurityAccessLogger {
  async record(input: SecurityAccessLogInput): Promise<void> {
    try {
      const shouldLog = await this.shouldLog({
        companyId: input.companyId,
        actionCode: input.actionCode,
        accessResult: input.accessResult,
      });

      if (!shouldLog) return;

      const resolved = await this.resolveModuleAndSubmodule(
        input.companyId,
        input.moduleCode,
        input.submoduleCode,
      );

      await prisma.security_logs_access.create({
        data: {
          user_id: input.userId,
          module_id: resolved.module_id ?? undefined,
          submodule_id: resolved.submodule_id ?? undefined,
          resource_type: input.resourceType,
          resource_id: input.resourceId ?? undefined,
          action_code: input.actionCode,
          access_result: input.accessResult,
          ip_address: input.ipAddress ?? undefined,
          user_agent: input.userAgent ?? undefined,
          metadata: {
            path: input.path,
            method: input.method,
            module_code: input.moduleCode,
            submodule_code: input.submoduleCode ?? null,
            required_permission: input.actionCode,
            decision_reason: input.decisionReason,
            company_id: input.companyId,
            role_ids: input.roleIds,
            ...(input.metadata ?? {}),
          },
        },
      });
    } catch (error) {
      if (isMissingRelation(error, 'public.security_logs_access')) return;
      throw error;
    }
  }

  private async shouldLog(input: {
    companyId: string;
    actionCode: AccessPermissionCode;
    accessResult: LogResult;
  }): Promise<boolean> {
    if (input.accessResult === 'denied' || input.accessResult === 'error') {
      return this.isLoggingEnabled(input.companyId);
    }

    if (input.accessResult === 'allowed' && input.actionCode === 'X') {
      return this.isLoggingEnabled(input.companyId);
    }

    return false;
  }

  async isLoggingEnabled(companyId: string): Promise<boolean> {
    try {
      const rows = await prisma.$queryRaw<SecurityToggleRow[]>(Prisma.sql`
        SELECT sm.id::text AS module_id, ss.id::text AS submodule_id, ss.is_active
        FROM public.security_module sm
        LEFT JOIN public.security_submodule ss
          ON ss.module_id = sm.id
         AND ss.code = 'access_logs'
        WHERE sm.company_id = ${companyId}::uuid
          AND sm.code = 'core'
        LIMIT 1
      `);

      return Boolean(rows[0]?.is_active);
    } catch (error) {
      if (isMissingRelation(error, 'public.security_submodule')) return false;
      if (isMissingRelation(error, 'public.security_module')) return false;
      throw error;
    }
  }

  private async resolveModuleAndSubmodule(
    companyId: string,
    moduleCode: string,
    submoduleCode?: string,
  ): Promise<ResolvedModuleRow> {
    try {
      const rows = await prisma.$queryRaw<ResolvedModuleRow[]>(Prisma.sql`
        SELECT
          sm.id::text AS module_id,
          ss.id::text AS submodule_id
        FROM public.security_module sm
        LEFT JOIN public.security_submodule ss
          ON ss.module_id = sm.id
         AND ${submoduleCode ? Prisma.sql`ss.code = ${submoduleCode}` : Prisma.sql`false`}
        WHERE sm.company_id = ${companyId}::uuid
          AND sm.code = ${moduleCode}
        LIMIT 1
      `);

      return rows[0] ?? { module_id: null, submodule_id: null };
    } catch (error) {
      if (isMissingRelation(error, 'public.security_submodule')) {
        const rows = await prisma.$queryRaw<Array<{ module_id: string | null }>>(Prisma.sql`
          SELECT sm.id::text AS module_id
          FROM public.security_module sm
          WHERE sm.company_id = ${companyId}::uuid
            AND sm.code = ${moduleCode}
          LIMIT 1
        `);
        return { module_id: rows[0]?.module_id ?? null, submodule_id: null };
      }
      if (isMissingRelation(error, 'public.security_module')) return { module_id: null, submodule_id: null };
      throw error;
    }
  }
}

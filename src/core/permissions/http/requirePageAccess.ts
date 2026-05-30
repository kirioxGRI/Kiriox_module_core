import { redirect } from 'next/navigation';
import { getAuthContext } from '@/core/auth/auth-server';
import { getServerAccessContext } from '@/core/permissions/server/getServerAccessContext';
import { PrismaSecurityAccessLogger } from '@/core/permissions/infrastructure/PrismaSecurityAccessLogger';
import { hasModulePermission } from '@/core/permissions/domain';
import type { AccessContext, AccessRequirement } from '@/shared/types';

const accessLogger = new PrismaSecurityAccessLogger();

type RequirePageAccessInput = AccessRequirement & {
  path: string;
  redirectTo?: string;
};

export async function requirePageAccess(input: RequirePageAccessInput): Promise<AccessContext> {
  const auth = await getAuthContext();
  if (!auth) {
    redirect('/login');
  }

  // getServerAccessContext uses React.cache() — if the layout already called it,
  // this returns the cached result with zero extra DB queries.
  const accessContext = await getServerAccessContext();
  if (!accessContext) {
    redirect('/login');
  }

  const roleIds = accessContext.roles.map((role) => role.id);

  if (!accessContext.companyModules.includes(input.module)) {
    await accessLogger.record({
      userId: auth.userId,
      companyId: accessContext.company.id,
      moduleCode: input.module,
      submoduleCode: input.submoduleCode,
      resourceType: input.resourceType ?? 'page',
      actionCode: input.permission,
      accessResult: 'denied',
      decisionReason: 'module_not_enabled',
      roleIds,
      path: input.path,
      method: 'PAGE',
      metadata: { source: 'server_page_guard' },
    });
    redirect(input.redirectTo ?? '/main_dashboard');
  }

  const allowed = hasModulePermission(accessContext.moduleAccess, input.module, input.permission);
  if (!allowed) {
    await accessLogger.record({
      userId: auth.userId,
      companyId: accessContext.company.id,
      moduleCode: input.module,
      submoduleCode: input.submoduleCode,
      resourceType: input.resourceType ?? 'page',
      actionCode: input.permission,
      accessResult: 'denied',
      decisionReason: 'insufficient_permission',
      roleIds,
      path: input.path,
      method: 'PAGE',
      metadata: { source: 'server_page_guard' },
    });
    redirect(input.redirectTo ?? '/main_dashboard');
  }

  return accessContext;
}

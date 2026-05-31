import { redirect } from 'next/navigation';
import { getAuthContext, isDevAuthBypassEnabled } from '@/core/auth/auth-server';
import { hasSystemPermission } from '@/core/permissions/domain';
import { PrismaAccessContextRepository } from '@/core/permissions/infrastructure/PrismaAccessContextRepository';
import { PrismaSecurityAccessLogger } from '@/core/permissions/infrastructure/PrismaSecurityAccessLogger';
import type { AccessContext, AccessPermissionCode } from '@/shared/types';

const accessRepository = new PrismaAccessContextRepository();
const accessLogger = new PrismaSecurityAccessLogger();

type RequireSystemPageAccessInput = {
  system: string;
  permission: AccessPermissionCode;
  path: string;
  redirectTo?: string;
  submoduleCode?: string;
  resourceType?: string;
};

export async function requireSystemPageAccess(input: RequireSystemPageAccessInput): Promise<AccessContext> {
  const auth = await getAuthContext();
  if (!auth) {
    redirect('/login');
  }

  const companyId = auth.tenantId;

  if (isDevAuthBypassEnabled()) {
    return accessRepository.getAccessContext({
      userId: auth.userId,
      companyId,
      fallbackEmail: auth.email,
    });
  }

  const belongsToCompany = await accessRepository.userBelongsToCompany(auth.userId, companyId);
  if (!belongsToCompany) {
    await accessLogger.record({
      userId: auth.userId,
      companyId,
      moduleCode: input.system,
      submoduleCode: input.submoduleCode,
      resourceType: input.resourceType ?? 'page',
      actionCode: input.permission,
      accessResult: 'denied',
      decisionReason: 'user_not_in_company',
      roleIds: [],
      path: input.path,
      method: 'PAGE',
      metadata: { source: 'server_system_page_guard' },
    });
    redirect(input.redirectTo ?? '/main_dashboard');
  }

  const accessContext = await accessRepository.getAccessContext({
    userId: auth.userId,
    companyId,
    fallbackEmail: auth.email,
  });

  const roleIds = accessContext.roles.map((role) => role.id);
  if (!accessContext.companySystems.some((system) => system.code === input.system)) {
    await accessLogger.record({
      userId: auth.userId,
      companyId,
      moduleCode: input.system,
      submoduleCode: input.submoduleCode,
      resourceType: input.resourceType ?? 'page',
      actionCode: input.permission,
      accessResult: 'denied',
      decisionReason: 'system_not_enabled',
      roleIds,
      path: input.path,
      method: 'PAGE',
      metadata: { source: 'server_system_page_guard' },
    });
    redirect(input.redirectTo ?? '/main_dashboard');
  }

  const allowed = hasSystemPermission(accessContext.systemAccess, input.system, input.permission);
  if (!allowed) {
    await accessLogger.record({
      userId: auth.userId,
      companyId,
      moduleCode: input.system,
      submoduleCode: input.submoduleCode,
      resourceType: input.resourceType ?? 'page',
      actionCode: input.permission,
      accessResult: 'denied',
      decisionReason: 'insufficient_permission',
      roleIds,
      path: input.path,
      method: 'PAGE',
      metadata: { source: 'server_system_page_guard' },
    });
    redirect(input.redirectTo ?? '/main_dashboard');
  }

  return accessContext;
}

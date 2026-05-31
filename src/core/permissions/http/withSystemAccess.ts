import { getAuthContext, isDevAuthBypassEnabled } from '@/core/auth/auth-server';
import { hasSystemPermission } from '@/core/permissions/domain';
import { PrismaAccessContextRepository } from '@/core/permissions/infrastructure/PrismaAccessContextRepository';
import { PrismaSecurityAccessLogger } from '@/core/permissions/infrastructure/PrismaSecurityAccessLogger';
import type { AccessContext, AccessPermissionCode } from '@/shared/types';
import { ApiError } from '@/shared/types';

type RouteContext = { params?: unknown } | undefined;
type RouteHandler = (request: Request, context?: RouteContext) => Promise<Response> | Response;

export type SystemAccessRequirement = {
  system: string;
  permission: AccessPermissionCode;
  submoduleCode?: string;
  resourceType?: string;
};

export type RouteSystemAccessContext = {
  auth: { userId: string; tenantId: string; email?: string; roleCode?: string };
  user: { id: string; email?: string };
  company: { id: string };
  access: SystemAccessRequirement;
  accessContext?: AccessContext;
};

type SystemAccessRouteHandler = (
  request: Request,
  context: RouteContext | undefined,
  access: RouteSystemAccessContext
) => Promise<Response> | Response;

const accessRepository = new PrismaAccessContextRepository();
const accessLogger = new PrismaSecurityAccessLogger();

function resolveCompanyId(request: Request, auth: { tenantId: string }): string {
  const url = new URL(request.url);
  const selected =
    url.searchParams.get('company_id') ||
    request.headers.get('x-company-id') ||
    auth.tenantId;

  if (!selected) throw ApiError.forbidden('Company context missing');
  return selected;
}

function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null;
  }

  return request.headers.get('x-real-ip');
}

async function logAccessAttempt(
  request: Request,
  input: {
    userId: string;
    companyId: string;
    systemCode: string;
    submoduleCode?: string;
    resourceType?: string;
    actionCode: AccessPermissionCode;
    accessResult: 'allowed' | 'denied' | 'error';
    decisionReason: string;
    roleIds: string[];
    metadata?: Record<string, unknown>;
  },
) {
  await accessLogger.record({
    userId: input.userId,
    companyId: input.companyId,
    moduleCode: input.systemCode,
    submoduleCode: input.submoduleCode,
    resourceType: input.resourceType ?? 'api',
    actionCode: input.actionCode,
    accessResult: input.accessResult,
    decisionReason: input.decisionReason,
    roleIds: input.roleIds,
    path: new URL(request.url).pathname,
    method: request.method,
    ipAddress: getClientIp(request),
    userAgent: request.headers.get('user-agent'),
    metadata: input.metadata,
  });
}

export function withSystemAccess(
  requirement: SystemAccessRequirement,
  handler: SystemAccessRouteHandler,
): RouteHandler {
  return async (request: Request, context?: RouteContext) => {
    const auth = await getAuthContext();
    if (!auth) throw ApiError.unauthorized();

    const companyId = resolveCompanyId(request, auth);
    const routeAccess: RouteSystemAccessContext = {
      auth,
      user: { id: auth.userId, email: auth.email },
      company: { id: companyId },
      access: requirement,
    };

    let accessContext: AccessContext;
    try {
      accessContext = await accessRepository.getAccessContext({
        userId: auth.userId,
        companyId,
        fallbackEmail: auth.email,
      });
    } catch (error) {
      await logAccessAttempt(request, {
        userId: auth.userId,
        companyId,
        systemCode: requirement.system,
        submoduleCode: requirement.submoduleCode,
        resourceType: requirement.resourceType,
        actionCode: requirement.permission,
        accessResult: 'error',
        decisionReason: 'access_context_resolution_failed',
        roleIds: [],
        metadata: { error: error instanceof Error ? error.message : 'unknown_error' },
      });
      throw error;
    }

    routeAccess.accessContext = accessContext;

    if (isDevAuthBypassEnabled()) {
      return handler(request, context, routeAccess);
    }

    const roleIds = accessContext.roles.map((role) => role.id);
    if (!accessContext.companySystems.some((system) => system.code === requirement.system)) {
      await logAccessAttempt(request, {
        userId: auth.userId,
        companyId,
        systemCode: requirement.system,
        submoduleCode: requirement.submoduleCode,
        resourceType: requirement.resourceType,
        actionCode: requirement.permission,
        accessResult: 'denied',
        decisionReason: 'system_not_enabled',
        roleIds,
      });
      throw ApiError.forbidden('System is not enabled');
    }

    const allowed = hasSystemPermission(
      accessContext.systemAccess,
      requirement.system,
      requirement.permission,
    );

    if (!allowed) {
      await logAccessAttempt(request, {
        userId: auth.userId,
        companyId,
        systemCode: requirement.system,
        submoduleCode: requirement.submoduleCode,
        resourceType: requirement.resourceType,
        actionCode: requirement.permission,
        accessResult: 'denied',
        decisionReason: 'insufficient_permission',
        roleIds,
      });
      throw ApiError.forbidden('Insufficient permissions');
    }

    return handler(request, context, routeAccess);
  };
}

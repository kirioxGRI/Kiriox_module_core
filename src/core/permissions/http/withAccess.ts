import { getAuthContext, isDevAuthBypassEnabled } from '@/core/auth/auth-server';
import {
  CheckCompanyMembershipUseCase,
  CheckModuleAccessUseCase,
  CheckPermissionUseCase,
} from '@/core/permissions/application/use-cases';
import { normalizePermissionCode } from '@/core/permissions/domain';
import { PrismaAccessContextRepository } from '@/core/permissions/infrastructure/PrismaAccessContextRepository';
import type { AccessRequirement, ModuleCode } from '@/shared/types';
import { ApiError } from '@/shared/types';

type RouteContext = { params?: unknown } | undefined;
type RouteHandler = (request: Request, context?: RouteContext) => Promise<Response> | Response;

export type RouteAccessContext = {
  auth: { userId: string; tenantId: string; roleCode: string; email?: string };
  user: { id: string; roleCode: string; email?: string };
  company: { id: string };
  access: AccessRequirement;
};

type AccessRouteHandler = (
  request: Request,
  context: RouteContext | undefined,
  access: RouteAccessContext
) => Promise<Response> | Response;

const accessRepository = new PrismaAccessContextRepository();
const checkCompanyMembership = new CheckCompanyMembershipUseCase(accessRepository);
const checkModuleAccess = new CheckModuleAccessUseCase(accessRepository);
const checkPermission = new CheckPermissionUseCase(accessRepository);

function resolveCompanyId(
  request: Request,
  auth: { tenantId: string }
): string {
  const url = new URL(request.url);
  const selected =
    url.searchParams.get('company_id') ||
    request.headers.get('x-company-id') ||
    auth.tenantId;

  if (!selected) throw ApiError.forbidden('Company context missing');
  return selected;
}

function normalizeModule(module: string): ModuleCode {
  if (module === 'risk') return 'structural-risk';
  return module as ModuleCode;
}

export function withAccess(
  requirement: AccessRequirement,
  handler: AccessRouteHandler
): RouteHandler {
  return async (request: Request, context?: RouteContext) => {
    const auth = await getAuthContext();
    if (!auth) throw ApiError.unauthorized();

    const companyId = resolveCompanyId(request, auth);
    const moduleCode = normalizeModule(requirement.module);
    const permissionCode = normalizePermissionCode(moduleCode, requirement.permission);

    const routeAccess: RouteAccessContext = {
      auth,
      user: { id: auth.userId, roleCode: auth.roleCode, email: auth.email },
      company: { id: companyId },
      access: { module: moduleCode, permission: permissionCode },
    };

    if (isDevAuthBypassEnabled()) {
      return handler(request, context, routeAccess);
    }

    const belongsToCompany = await checkCompanyMembership.execute(
      auth.userId,
      companyId,
    );
    if (!belongsToCompany) {
      throw ApiError.forbidden('User does not belong to company');
    }

    const moduleEnabled = await checkModuleAccess.execute(companyId, moduleCode);
    if (!moduleEnabled) {
      throw ApiError.forbidden('Module is not enabled');
    }

    const allowed = await checkPermission.execute(
      auth.userId,
      companyId,
      permissionCode,
    );
    if (!allowed) {
      throw ApiError.forbidden('Insufficient permissions');
    }

    return handler(request, context, routeAccess);
  };
}

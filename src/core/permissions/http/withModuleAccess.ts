import { withAccess } from './withAccess';
import { normalizeAccessPermissionCode } from '../domain';
import type { AccessPermissionCode, ModuleCode } from '@/shared/types';

type LegacyModuleKey = ModuleCode | 'risk';
type RouteContext = { params?: unknown } | undefined;
type RouteHandler = (request: Request, context?: RouteContext) => Promise<Response> | Response;

function normalizeModule(moduleKey: LegacyModuleKey): ModuleCode {
  if (moduleKey === 'risk') return 'structural-risk';
  return moduleKey;
}

function normalizePermission(permission: string): AccessPermissionCode {
  return normalizeAccessPermissionCode(permission);
}

export function withModuleAccess(
  moduleKey: LegacyModuleKey,
  permission: string,
  handler: RouteHandler
): RouteHandler {
  return withAccess(
    {
      module: normalizeModule(moduleKey),
      permission: normalizePermission(permission),
    },
    (request, context) => handler(request, context)
  );
}

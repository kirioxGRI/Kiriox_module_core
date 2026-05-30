import { nextHandler, withAccess } from '@/shared/http';
import { getHardgateHandler, patchHardgateHandler } from '@/modules/structural-risk/api/handlers/hardgateHandlers';

export const dynamic = 'force-dynamic';

export const GET = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'R', submoduleCode: 'wizard_hardgate' }, async (req, _ctx, access) =>
    getHardgateHandler(req, access)
  )
);

export const PATCH = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'W', submoduleCode: 'wizard_hardgate' }, async (req, _ctx, access) =>
    patchHardgateHandler(req, access)
  )
);

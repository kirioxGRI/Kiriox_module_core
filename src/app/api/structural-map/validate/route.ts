import { nextHandler, withAccess } from '@/shared/http';
import { validateModelHandler } from '@/modules/structural-map/api/handlers/validateModelHandler';

export const dynamic = 'force-dynamic';

export const POST = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'R', submoduleCode: 'analysis_structural' }, async (req: Request) => {
    const body = await req.json() as { rootEntityId?: string };
    return validateModelHandler(body.rootEntityId ?? '');
  })
);

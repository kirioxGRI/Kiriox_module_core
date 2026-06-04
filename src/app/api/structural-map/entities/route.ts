import { nextHandler, withAccess } from '@/shared/http';
import { createEntityHandler } from '@/modules/structural-map/api/handlers/mutateEntityHandler';

export const dynamic = 'force-dynamic';

export const POST = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'W', submoduleCode: 'analysis_structural' }, async (req: Request) =>
    createEntityHandler(req)
  )
);

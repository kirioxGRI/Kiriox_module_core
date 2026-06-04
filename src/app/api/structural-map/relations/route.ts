import { nextHandler, withAccess } from '@/shared/http';
import { createRelationHandler } from '@/modules/structural-map/api/handlers/mutateRelationHandler';

export const dynamic = 'force-dynamic';

export const POST = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'W', submoduleCode: 'analysis_structural' }, async (req: Request) =>
    createRelationHandler(req)
  )
);

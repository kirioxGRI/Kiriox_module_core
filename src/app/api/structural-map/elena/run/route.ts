import { nextHandler, withAccess } from '@/shared/http';
import { runElenaEngineHandler } from '@/modules/structural-map/api/handlers/runElenaEngineHandler';

export const dynamic = 'force-dynamic';

export const POST = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'X', submoduleCode: 'analysis_structural' }, async (req: Request) =>
    runElenaEngineHandler(req)
  )
);

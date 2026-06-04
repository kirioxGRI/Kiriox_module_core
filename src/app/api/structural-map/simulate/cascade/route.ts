import { nextHandler, withAccess } from '@/shared/http';
import { runSimulationHandler } from '@/modules/structural-map/api/handlers/runSimulationHandler';

export const dynamic = 'force-dynamic';

export const POST = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'X', submoduleCode: 'analysis_structural' }, async (req: Request) =>
    runSimulationHandler(req)
  )
);

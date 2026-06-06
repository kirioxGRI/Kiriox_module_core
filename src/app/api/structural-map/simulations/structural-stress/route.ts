import { nextHandler, withAccess } from '@/shared/http';
import { runStructuralStressHandler } from '@/modules/structural-map/api/handlers/runStructuralStressHandler';

export const dynamic = 'force-dynamic';

export const POST = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'X', submoduleCode: 'analysis_structural' }, async (req: Request) =>
    runStructuralStressHandler(req)
  )
);

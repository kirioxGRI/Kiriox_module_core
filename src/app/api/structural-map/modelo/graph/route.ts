import { nextHandler, withAccess } from '@/shared/http';
import { getModeloGraphHandler } from '@/modules/structural-map/api/handlers/getModeloGraphHandler';

export const dynamic = 'force-dynamic';

export const GET = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'R', submoduleCode: 'analysis_structural' }, async () =>
    getModeloGraphHandler()
  )
);

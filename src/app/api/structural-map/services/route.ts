import { nextHandler, withAccess } from '@/shared/http';
import { getServicesHandler } from '@/modules/structural-map/api/handlers/getServicesHandler';

export const dynamic = 'force-dynamic';

export const GET = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'R', submoduleCode: 'analysis_structural' }, async () =>
    getServicesHandler()
  )
);

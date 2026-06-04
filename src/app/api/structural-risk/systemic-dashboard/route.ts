import { nextHandler, withAccess } from '@/shared/http';
import { getSystemicDashboardHandler } from '@/modules/structural-risk/api/handlers/getSystemicDashboardHandler';

export const dynamic = 'force-dynamic';

export const GET = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'R', submoduleCode: 'analysis_structural' }, async () =>
    getSystemicDashboardHandler()
  )
);

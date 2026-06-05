import { nextHandler, withAccess } from '@/shared/http';
import { getPortfolioRunsHandler } from '@/modules/structural-map/api/handlers/getPortfolioRunsHandler';

export const dynamic = 'force-dynamic';

export const GET = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'R', submoduleCode: 'analysis_structural' }, async () =>
    getPortfolioRunsHandler()
  )
);

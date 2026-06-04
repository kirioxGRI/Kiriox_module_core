import { withAccess } from '@/core/permissions/http/withAccess';
import { runAnalysisHandler } from '@/modules/structural-map/api/handlers/runAnalysisHandler';

export const dynamic = 'force-dynamic';

export const POST = withAccess(
  { module: 'structural-risk', permission: 'X', submoduleCode: 'analysis_structural' },
  async (req: Request, context) => {
    const params = await (context?.params as Promise<{ type: string }>);
    return runAnalysisHandler(req, params.type);
  }
);

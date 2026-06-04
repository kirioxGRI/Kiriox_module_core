import { withAccess } from '@/core/permissions/http/withAccess';
import { deleteEntityHandler, updateEntityHandler } from '@/modules/structural-map/api/handlers/mutateEntityHandler';

export const dynamic = 'force-dynamic';

export const DELETE = withAccess(
  { module: 'structural-risk', permission: 'W', submoduleCode: 'analysis_structural' },
  async (_req, context) => {
    const params = await (context?.params as Promise<{ id: string }>);
    return deleteEntityHandler(params.id);
  }
);

export const PATCH = withAccess(
  { module: 'structural-risk', permission: 'W', submoduleCode: 'analysis_structural' },
  async (req, context) => {
    const params = await (context?.params as Promise<{ id: string }>);
    return updateEntityHandler(params.id, req);
  }
);

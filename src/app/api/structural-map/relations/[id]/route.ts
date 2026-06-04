import { withAccess } from '@/core/permissions/http/withAccess';
import { deleteRelationHandler } from '@/modules/structural-map/api/handlers/mutateRelationHandler';

export const dynamic = 'force-dynamic';

export const DELETE = withAccess(
  { module: 'structural-risk', permission: 'W', submoduleCode: 'analysis_structural' },
  async (_req, context) => {
    const params = await (context?.params as Promise<{ id: string }>);
    return deleteRelationHandler(params.id);
  }
);

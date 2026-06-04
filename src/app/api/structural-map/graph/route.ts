import { nextHandler, withAccess } from '@/shared/http';
import { getGraphHandler } from '@/modules/structural-map/api/handlers/getGraphHandler';

export const dynamic = 'force-dynamic';

export const GET = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'R', submoduleCode: 'analysis_structural' }, async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const rootEntityId = searchParams.get('rootEntityId') ?? '';
    const depth = parseInt(searchParams.get('depth') ?? '2', 10);
    return getGraphHandler(rootEntityId, depth);
  })
);

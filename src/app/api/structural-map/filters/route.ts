import { nextHandler, withAccess } from '@/shared/http';
import { getFilterConfigHandler } from '@/modules/structural-map/api/handlers/getFilterConfigHandler';
import { saveFilterPreferenceHandler } from '@/modules/structural-map/api/handlers/saveFilterPreferenceHandler';

export const dynamic = 'force-dynamic';

export const GET = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'R', submoduleCode: 'analysis_structural' }, async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get('entityId');
    return getFilterConfigHandler(entityId);
  }),
);

export const POST = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'W', submoduleCode: 'analysis_structural' }, async (req: Request) =>
    saveFilterPreferenceHandler(req),
  ),
);

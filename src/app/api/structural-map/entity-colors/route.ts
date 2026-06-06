import { nextHandler, withAccess } from '@/shared/http';
import { getEntityColorsHandler } from '@/modules/structural-map/api/handlers/getEntityColorsHandler';

export const dynamic = 'force-dynamic';

export const GET = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'R', submoduleCode: 'analysis_structural' }, async () =>
    getEntityColorsHandler()
  )
);

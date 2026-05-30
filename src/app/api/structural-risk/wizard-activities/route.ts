import { nextHandler, withAccess } from '@/shared/http';
import {
  getStructuralWizardActivitiesHandler,
  patchStructuralWizardActivitiesHandler,
} from '@/modules/structural-risk/api/handlers/structuralCaptureWizardHandlers';

export const dynamic = 'force-dynamic';

export const GET = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'R', submoduleCode: 'wizard_activities' }, async (req, _ctx, access) =>
    getStructuralWizardActivitiesHandler(req, access)
  )
);

export const PATCH = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'W', submoduleCode: 'wizard_activities' }, async (req, _ctx, access) =>
    patchStructuralWizardActivitiesHandler(req, access)
  )
);

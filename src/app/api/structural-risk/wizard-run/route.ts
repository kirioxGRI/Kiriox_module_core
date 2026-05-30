import { nextHandler, withAccess } from '@/shared/http';
import {
  deleteStructuralRunWizardHandler,
  getStructuralRunWizardHandler,
  patchStructuralRunWizardHandler,
  postStructuralRunWizardHandler,
} from '@/modules/structural-risk/api/handlers/structuralCaptureWizardHandlers';

export const dynamic = 'force-dynamic';

export const GET = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'R', submoduleCode: 'wizard_run' }, async (req, _ctx, access) =>
    getStructuralRunWizardHandler(req, access)
  )
);

export const POST = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'X', submoduleCode: 'wizard_run' }, async (req, _ctx, access) =>
    postStructuralRunWizardHandler(req, access)
  )
);

export const PATCH = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'X', submoduleCode: 'wizard_run' }, async (req, _ctx, access) =>
    patchStructuralRunWizardHandler(req, access)
  )
);

export const DELETE = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'X', submoduleCode: 'wizard_run' }, async (req, _ctx, access) =>
    deleteStructuralRunWizardHandler(req, access)
  )
);

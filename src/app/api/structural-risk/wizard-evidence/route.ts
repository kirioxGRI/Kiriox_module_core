import { nextHandler, withAccess } from '@/shared/http';
import { getEvidenceHandler, patchEvidenceHandler } from '@/modules/structural-risk/api/handlers/evidenceHandlers';

export const dynamic = 'force-dynamic';

export const GET = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'R', submoduleCode: 'wizard_evidence' }, async (req, _ctx, access) =>
    getEvidenceHandler(req, access)
  )
);

export const PATCH = nextHandler(
  withAccess({ module: 'structural-risk', permission: 'W', submoduleCode: 'wizard_evidence' }, async (req, _ctx, access) =>
    patchEvidenceHandler(req, access)
  )
);

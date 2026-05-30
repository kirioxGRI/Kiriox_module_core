import { withAccess } from "@/core/permissions/http/withAccess";
import { ok } from "@/shared/utils/http-responses";
import { PrismaLinearRiskRepository } from "../../infrastructure/repositories/PrismaLinearRiskRepository";

const repo = new PrismaLinearRiskRepository();

export const POST = withAccess({ module: 'linear-risk', permission: 'W', submoduleCode: 'run_ra' }, async (request, context, access) => {
  const url = new URL(request.url);
  const forceNew = url.searchParams.get('forceNew') === 'true';
  const result = await repo.createEvaluation(access.company.id, forceNew);
  return ok(result);
});

export const DELETE = withAccess({ module: 'linear-risk', permission: 'W', submoduleCode: 'run_ra' }, async (request) => {
  const body = await request.json();
  const id = String(body?.id ?? '').trim();
  if (!id) return new Response('id is required', { status: 400 });
  await repo.deleteEvaluation(id);
  return ok({ ok: true });
});

export const PATCH = withAccess({ module: 'linear-risk', permission: 'W', submoduleCode: 'run_ra' }, async (request, context, access) => {
  const body = await request.json();
  const runRaId = String(body?.runRaId ?? body?.id ?? '').trim();
  const { toCode, to_state, changeReason, completionReason } = body;

  if (!runRaId) return new Response('runRaId is required', { status: 400 });

  await repo.transitionLifecycleState({
    runRaId,
    companyId: access.company.id,
    changedBy: access.user.id,
    toCode: toCode || to_state || 'completed',
    changeReason,
    completionReason
  });

  return ok({ ok: true });
});

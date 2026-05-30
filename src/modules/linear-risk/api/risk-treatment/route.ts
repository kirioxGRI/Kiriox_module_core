import { withAccess } from "@/core/permissions/http/withAccess";
import { ok, created } from "@/shared/utils/http-responses";
import { PrismaLinearRiskRepository } from "../../infrastructure/repositories/PrismaLinearRiskRepository";

const repo = new PrismaLinearRiskRepository();

export const GET = withAccess({ module: 'linear-risk', permission: 'R', submoduleCode: 'risk_treatment' }, async (request) => {
  const { searchParams } = new URL(request.url);
  const runRaId = searchParams.get('runRaId');
  const riskId = searchParams.get('riskId');

  if (!runRaId || !riskId) return new Response('runRaId and riskId are required', { status: 400 });

  const actions = await repo.getRiskTreatmentActions(runRaId, riskId);
  return ok({ actions });
});

export const POST = withAccess({ module: 'linear-risk', permission: 'W', submoduleCode: 'risk_treatment' }, async (request) => {
  const body = await request.json();
  const { runRaId, riskId, ...data } = body;

  if (!runRaId || !riskId) return new Response('runRaId and riskId are required', { status: 400 });

  const id = await repo.upsertRiskTreatmentAction(runRaId, riskId, data);
  return created({ ok: true, id });
});

export const DELETE = withAccess({ module: 'linear-risk', permission: 'W', submoduleCode: 'risk_treatment' }, async (request) => {
  const { searchParams } = new URL(request.url);
  const runRaId = searchParams.get('runRaId');
  const id = searchParams.get('id');

  if (!runRaId || !id) return new Response('runRaId and id are required', { status: 400 });

  await repo.deleteRiskTreatmentAction(runRaId, id);
  return ok({ ok: true });
});

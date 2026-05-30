import { withAccess } from "@/core/permissions/http/withAccess";
import { ok, created } from "@/shared/utils/http-responses";
import { PrismaLinearRiskRepository } from "../../infrastructure/repositories/PrismaLinearRiskRepository";

const repo = new PrismaLinearRiskRepository();

export const GET = withAccess({ module: 'linear-risk', permission: 'R', submoduleCode: 'analysis_risks' }, async (request, context, access) => {
  const { searchParams } = new URL(request.url);
  const runRaId = searchParams.get('runRaId');

  if (!runRaId) return new Response('runRaId is required', { status: 400 });

  const data = await repo.getRiskAnalysisData(runRaId, access.company.id);
  return ok(data);
});

export const POST = withAccess({ module: 'linear-risk', permission: 'W', submoduleCode: 'analysis_risks' }, async (request, context, access) => {
  const body = await request.json();
  const { runRaId, ...riskData } = body;

  if (!runRaId) return new Response('runRaId is required', { status: 400 });

  const id = await repo.upsertRisk(runRaId, riskData, access.company.id, access.user.id);
  return created({ ok: true, id });
});

export const DELETE = withAccess({ module: 'linear-risk', permission: 'W', submoduleCode: 'analysis_risks' }, async (request) => {
  const { searchParams } = new URL(request.url);
  const runRaId = searchParams.get('runRaId');
  const id = searchParams.get('id');

  if (!runRaId || !id) return new Response('runRaId and id are required', { status: 400 });

  await repo.deleteRisk(runRaId, id);
  return ok({ ok: true });
});

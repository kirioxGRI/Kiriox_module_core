import { withAccess } from "@/core/permissions/http/withAccess";
import { ok } from "@/shared/utils/http-responses";
import { PrismaLinearRiskRepository } from "../../infrastructure/repositories/PrismaLinearRiskRepository";

const repo = new PrismaLinearRiskRepository();

export const GET = withAccess({ module: 'linear-risk', permission: 'R', submoduleCode: 'risk_valuation' }, async (request, context, access) => {
  const { searchParams } = new URL(request.url);
  const runRaId = searchParams.get('runRaId');

  if (!runRaId) return new Response('runRaId is required', { status: 400 });

  const data = await repo.getRiskValuationData(runRaId, access.company.id);
  return ok(data);
});

export const POST = withAccess({ module: 'linear-risk', permission: 'W', submoduleCode: 'risk_valuation' }, async (request) => {
  const body = await request.json();
  const { runRaId, riskId, valorationId } = body;

  if (!runRaId || !riskId) return new Response('runRaId and riskId are required', { status: 400 });

  await repo.updateRiskValuation(runRaId, riskId, valorationId);
  return ok({ ok: true });
});

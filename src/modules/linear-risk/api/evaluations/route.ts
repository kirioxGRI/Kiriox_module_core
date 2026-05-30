import { withAccess } from "@/core/permissions/http/withAccess";
import { PrismaLinearRiskRepository } from "../../infrastructure/repositories/PrismaLinearRiskRepository";
import { GetLinearRiskEvaluationsUseCase } from "../../application/use-cases/GetLinearRiskEvaluationsUseCase";

const repository = new PrismaLinearRiskRepository();
const getEvaluationsUseCase = new GetLinearRiskEvaluationsUseCase(repository);

export const GET = withAccess({ module: 'linear-risk', permission: 'R', submoduleCode: 'evaluations' }, async (request, context, access) => {
  const { searchParams } = new URL(request.url);
  const elementId = searchParams.get("elementId") || undefined;
  const activityId = searchParams.get("activityId") || undefined;

  const result = await getEvaluationsUseCase.execute(
    access.company.id,
    elementId,
    activityId
  );

  console.log('[LinearRiskEvaluations] companyId:', access.company.id);
  console.log('[LinearRiskEvaluations] evaluations count:', result.evaluations.length);

  return Response.json(result);
});

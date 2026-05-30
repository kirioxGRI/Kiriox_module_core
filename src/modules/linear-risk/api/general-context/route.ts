import { withAccess } from "@/core/permissions/http/withAccess";
import { ok, created } from "@/shared/utils/http-responses";
import { PrismaLinearRiskRepository } from "../../infrastructure/repositories/PrismaLinearRiskRepository";

const repository = new PrismaLinearRiskRepository();

export const GET = withAccess({ module: 'linear-risk', permission: 'R', submoduleCode: 'general_context' }, async (req, context, access) => {
  const url = new URL(req.url);
  const runRaId = url.searchParams.get("runRaId");
  if (!runRaId) return new Response("runRaId is required", { status: 400 });

  const data = await repository.getGeneralContext(runRaId, access.company.id);
  
  // Map internal database fields to the frontend expected field names
  const mappedContext = data.context ? {
    objetivo: data.context.objective,
    alcance: data.context.scope,
    objeto_evaluado: data.context.object_type ?? "",
    responsable: data.context.description ?? "",
    inclusiones: data.context.inclusions ?? "",
    exclusiones: data.context.exclusions ?? "",
    periodo_inicio: data.context.evaluated_period_start ? String(data.context.evaluated_period_start).slice(0, 10) : "",
    periodo_fin: data.context.evaluated_period_end ? String(data.context.evaluated_period_end).slice(0, 10) : "",
    metodologia: data.context.methodology ?? "",
    supuestos: joinArray(data.context.assumptions),
    fuentes: joinArray(data.context.information_sources),
    apetito: data.context.risk_appetite ?? "",
    element_id: data.context.element_id ?? "",
    activity_id: data.context.activity_id ?? "",
  } : null;

  return ok({ 
    context: mappedContext, 
    appetiteCatalog: data.appetiteCatalog, 
    elements: data.elements, 
    activities: data.activities 
  });
});

export const POST = withAccess({ module: 'linear-risk', permission: 'W', submoduleCode: 'general_context' }, async (req) => {
  const body = await req.json();
  
  await repository.upsertGeneralContext({
    runRaId: body.runRaId,
    objective: body.objetivo?.trim(),
    scope: body.alcance?.trim(),
    objectType: body.objeto_evaluado ?? "",
    responsable: body.responsable ?? "",
    inclusions: body.inclusiones ?? "",
    exclusions: body.exclusiones ?? "",
    periodStart: body.periodo_inicio ?? "",
    periodEnd: body.periodo_fin ?? "",
    methodology: body.metodologia ?? "",
    assumptions: splitLines(body.supuestos),
    sources: splitLines(body.fuentes),
    riskAppetite: body.apetito ?? "",
    elementId: body.element_id || null,
    activityId: body.activity_id || null,
  });

  return created({ ok: true });
});

function splitLines(value?: string): string[] {
  if (!value?.trim()) return [];
  return value.split("\n").map(s => s.trim()).filter(Boolean);
}

function joinArray(value: unknown): string {
  if (Array.isArray(value)) return (value as string[]).join("\n");
  if (typeof value === "string") {
    try { return (JSON.parse(value) as string[]).join("\n"); } catch { return ""; }
  }
  return "";
}

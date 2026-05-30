import { withAccess } from "@/core/permissions/http/withAccess";
import { ok, created } from "@/shared/utils/http-responses";
import { PrismaLinearRiskRepository } from "../../infrastructure/repositories/PrismaLinearRiskRepository";

const repository = new PrismaLinearRiskRepository();

const EXTERNAL_CATEGORIES = ['regulacion', 'mercado', 'economia', 'competencia'] as const;
const INTERNAL_CATEGORIES = ['recursos', 'capacidades', 'procesos', 'sistemas', 'personas_clave'] as const;

function normalizeType(type: string | null | undefined): 'INTERNAL' | 'EXTERNAL' | null {
  if (!type) return null;
  const normalized = type.toUpperCase();
  if (normalized === 'INTERNO' || normalized === 'INTERNAL') return 'INTERNAL';
  if (normalized === 'EXTERNO' || normalized === 'EXTERNAL') return 'EXTERNAL';
  return null;
}

export const GET = withAccess({ module: 'linear-risk', permission: 'R', submoduleCode: 'internal_external' }, async (req) => {
  const url = new URL(req.url);
  const runRaId = url.searchParams.get("runRaId");
  const type = normalizeType(url.searchParams.get("type"));

  if (!runRaId) return new Response("runRaId is required", { status: 400 });
  if (!type) return new Response("type must be INTERNO or EXTERNO", { status: 400 });

  const rows = await repository.getInternalExternalContext(runRaId, type);
  const context: Record<string, string> = {};

  for (const row of rows) {
    context[row.factor_category] = row.factor_name ?? "";
  }

  return ok({ context });
});

export const POST = withAccess({ module: 'linear-risk', permission: 'W', submoduleCode: 'internal_external' }, async (req) => {
  const body = await req.json();
  const runRaId = String(body?.runRaId ?? '').trim();
  const type = normalizeType(body?.type);

  if (!runRaId) return new Response("runRaId is required", { status: 400 });
  if (!type) return new Response("type must be INTERNO or EXTERNO", { status: 400 });

  const categories = type === 'EXTERNAL' ? EXTERNAL_CATEGORIES : INTERNAL_CATEGORIES;
  const values = categories
    .map((category) => ({
      category,
      text: String((body as Record<string, unknown>)[category] ?? '').trim(),
    }))
    .filter((item) => item.text.length > 0);

  await repository.upsertInternalExternalContext(runRaId, type, values);

  return created({ ok: true });
});

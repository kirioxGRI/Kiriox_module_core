import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import PizZip from "pizzip";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Docxtemplater = require("docxtemplater") as typeof import("docxtemplater");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ImageModule = require("docxtemplater-image-module-free");
import { withAccess } from "@/core/permissions/http/withAccess";
import prisma from "@/infrastructure/db/prisma/client";
import { resolveEffectiveCompanyId } from "@/infrastructure/db/prisma/resolveEffectiveCompanyId";
import type { RouteAccessContext } from "@/core/permissions/http/withAccess";
import { Prisma } from "@/generated/prisma/client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TEMPLATE_PATH = "C:\\_CRE\\PLANTILLA_INFORME.docx";
const HEATMAP_DIR = "C:\\_CRE\\mapa";

function fmt(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function today(): string {
  return new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
}

async function fetchReportData(runRaId: string, companyId: string) {
  companyId = await resolveEffectiveCompanyId(companyId);
  const [evalRows, contextRows, riskRows, controlRows, levelRows, companyRows] = await Promise.all([
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT r.id::text, r.code, COALESCE(r.title,'Sin título') AS title,
             r.object_type, r.description, r.status
      FROM public.run_ra r
      WHERE r.id = ${runRaId}::uuid AND r.company_id = ${companyId}::uuid
      LIMIT 1
    `),
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT objective, scope, inclusions, exclusions,
             evaluated_period_start::text, evaluated_period_end::text,
             methodology, assumptions, risk_appetite
      FROM public.run_ra_contexto_evaluacion
      WHERE run_ra_id = ${runRaId}::uuid
      ORDER BY updated_at DESC NULLS LAST LIMIT 1
    `),
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT
        rk.id::text, rk.code, rk.name, rk.cause, rk.event, rk.consequence,
        rk.id_valoration::text,
        COALESCE(v.decision, 'Sin decisión') AS valoration_decision,
        a.impact_score::float8,
        a.probability_score::float8,
        a.inherent_risk_score::float8,
        a.calculation_rationale,
        COALESCE(ka.name, '') AS activity_name,
        COALESCE(u.name||' '||u.last_name, '') AS owner_name
      FROM public.run_ra_risks rk
      LEFT JOIN public.run_ra_risk_analysis a ON a.run_ra_risk_id = rk.id
      LEFT JOIN public.catalog_ra_valoration v ON v.id = rk.id_valoration
      LEFT JOIN public.activities ka ON ka.id = rk.activity_id
      LEFT JOIN public.security_users u ON u.id = rk.owner_id
      WHERE rk.run_ra_id = ${runRaId}::uuid
      ORDER BY rk.updated_at DESC
    `),
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT c.id_risk::text AS risk_id, c.name,
             c.design::float8, c.implementation::float8, c.operation::float8
      FROM public.run_ra_controls c
      WHERE c.run_ra_id = ${runRaId}::uuid AND c.is_active = true
      ORDER BY c.created_at ASC
    `),
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT code, name, min_score::int, max_score::int, color
      FROM public.catalog_risk_level
      WHERE is_active = true ORDER BY sort_order ASC
    `),
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT name FROM public.companies WHERE id = ${companyId}::uuid LIMIT 1
    `).catch(() => [] as Array<Record<string, unknown>>),
  ]);

  return { evalRows, contextRows, riskRows, controlRows, levelRows, companyRows };
}

function resolveLevel(score: number, levels: Array<Record<string, unknown>>): string {
  const level = levels.find((row) => score >= Number(row.min_score) && score <= Number(row.max_score));
  return typeof level?.name === "string" ? level.name : "—";
}

function patchDocumentXml(xml: string): string {
  return xml.replace(/>heatmap</g, ">%heatmap<");
}

async function generateReport(request: Request, access: RouteAccessContext) {
  const url = new URL(request.url);
  const runRaId = String(url.searchParams.get("runRaId") ?? "").trim();

  if (!UUID.test(runRaId)) {
    return NextResponse.json({ error: "runRaId inválido" }, { status: 400 });
  }

  if (!existsSync(TEMPLATE_PATH)) {
    return NextResponse.json({ error: `Plantilla no encontrada: ${TEMPLATE_PATH}` }, { status: 404 });
  }

  const { evalRows, contextRows, riskRows, controlRows, levelRows, companyRows } = await fetchReportData(
    runRaId,
    access.company.id
  );
  const effectiveCompanyId = await resolveEffectiveCompanyId(access.company.id);

  if (!evalRows[0]) {
    return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
  }

  const evaluation = evalRows[0];
  const context = contextRows[0] ?? {};
  const companyName =
    (typeof companyRows[0]?.name === "string" ? companyRows[0].name : undefined) ?? effectiveCompanyId;

  const controlsByRisk = new Map<string, Array<Record<string, unknown>>>();
  for (const control of controlRows) {
    const riskId = String(control.risk_id ?? "");
    const current = controlsByRisk.get(riskId) ?? [];
    current.push(control);
    controlsByRisk.set(riskId, current);
  }

  let totalInherent = 0;
  let totalResidual = 0;

  const hallazgos = riskRows.map((risk, index) => {
    const inherent = Number(risk.inherent_risk_score ?? 0);
    const controls = controlsByRisk.get(String(risk.id ?? "")) ?? [];
    let reduction = 0;

    for (const control of controls) {
      const effectiveness =
        (Number(control.design ?? 3) / 5) * 0.35 +
        (Number(control.implementation ?? 3) / 5) * 0.3 +
        (Number(control.operation ?? 3) / 5) * 0.35;
      reduction += inherent * effectiveness * 0.75;
    }

    reduction = Math.min(reduction, inherent);
    const residual = Math.max(0, inherent - reduction);
    totalInherent += inherent;
    totalResidual += residual;

    const inherentLevel = resolveLevel(inherent, levelRows);
    const residualLevel = resolveLevel(residual, levelRows);
    const controlNames =
      controls.map((control) => String(control.name ?? "")).filter(Boolean).join("; ") || "Sin controles mitigantes";

    return {
      numero: String(risk.code ?? index + 1),
      titulo: String(risk.name ?? "Riesgo sin título"),
      criterio: String(risk.activity_name ?? "Sin actividad"),
      condicion: String(risk.event ?? "—"),
      causa: String(risk.cause ?? "—"),
      efecto_riesgo: `${String(risk.consequence ?? "—")}  |  Inherente: ${inherent.toFixed(1)} pts`,
      nivel_riesgo: `${inherentLevel} (${inherent.toFixed(1)} pts)`,
      recomendacion:
        String(risk.valoration_decision ?? "Sin decisión") !== "Sin decisión"
          ? `Decisión: ${String(risk.valoration_decision)}`
          : "Pendiente de decisión",
      respuesta_auditado: "",
      evidencias: controlNames,
      observaciones: `Riesgo residual: ${residual.toFixed(1)} pts — Nivel: ${residualLevel}`,
    };
  });

  const totalReduction = totalInherent - totalResidual;
  const totalReductionPercent = totalInherent > 0 ? ((totalReduction / totalInherent) * 100).toFixed(1) : "0";
  const topLevel = resolveLevel(totalInherent / Math.max(riskRows.length, 1), levelRows);

  const resumenEjecutivo =
    `La evaluación "${String(evaluation.title ?? "Sin título")}" (${String(evaluation.code ?? "")}) ` +
    `fue realizada para el proceso/objeto: ${String(evaluation.object_type ?? "No definido")}. ` +
    `Se identificaron ${hallazgos.length} riesgo(s). El riesgo inherente total es de ${totalInherent.toFixed(1)} puntos ` +
    `y el residual de ${totalResidual.toFixed(1)} puntos, representando una reducción del ${totalReductionPercent}% ` +
    "a través de los controles mitigantes existentes.";

  const conclusionFinal =
    `El nivel de riesgo inherente consolidado es de ${totalInherent.toFixed(1)} puntos (${topLevel}). ` +
    `Con los controles implementados el riesgo residual se reduce a ${totalResidual.toFixed(1)} puntos. ` +
    (hallazgos.length > 0
      ? "Se recomienda priorizar el tratamiento de los riesgos con nivel Alto y Crítico identificados en el presente informe."
      : "No se registraron riesgos en esta evaluación.");

  const heatmapPath = join(HEATMAP_DIR, `${runRaId}_inherente.png`);
  const heatmapExists = existsSync(heatmapPath);

  const templateBuffer = readFileSync(TEMPLATE_PATH);
  const zip = new PizZip(templateBuffer);
  const documentXml = zip.files["word/document.xml"];

  if (documentXml) {
    zip.file("word/document.xml", patchDocumentXml(documentXml.asText()));
  }

  const imageModule = new ImageModule({
    centered: true,
    fileType: "png",
    getImage(tagValue: string) {
      const imagePath = tagValue || heatmapPath;
      return existsSync(imagePath) ? readFileSync(imagePath) : readFileSync(heatmapPath);
    },
    getSize() {
      return [500, 380];
    },
  });

  const doc = new Docxtemplater(zip, {
    modules: heatmapExists ? [imageModule] : [],
    delimiters: { start: "{{", end: "}}" },
    paragraphLoop: true,
    linebreaks: true,
  });

  const templateData: Record<string, unknown> = {
    empresa: companyName,
    periodo_inicio: fmt((context as Record<string, unknown>).evaluated_period_start as string | null | undefined),
    periodo_fin: fmt((context as Record<string, unknown>).evaluated_period_end as string | null | undefined),
    fecha_emision: today(),
    resumen_ejecutivo: resumenEjecutivo,
    mapa_calor: heatmapExists ? "Ver mapa de calor en sección siguiente" : "Mapa de calor no disponible",
    objetivos:
      String((context as Record<string, unknown>).objective ?? evaluation.description ?? "—"),
    alcance: String((context as Record<string, unknown>).scope ?? "—"),
    metodologia: String((context as Record<string, unknown>).methodology ?? "—"),
    hallazgos,
    heatmap: heatmapExists ? heatmapPath : null,
    conclusion_final: conclusionFinal,
    auditor_nombre: "",
    aprobador_nombre: "",
    auditor_firma: "",
    aprobador_firma: "",
    auditor_cargo: "",
    aprobador_cargo: "",
    fecha_firmas: today(),
    aspectos_positivos: [],
    notas_auditor: [],
  };

  try {
    doc.render(templateData);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Error al procesar plantilla: ${message}` }, { status: 500 });
  }

  const outputBuffer = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
  const filename = `informe_${String(evaluation.code ?? runRaId)}.docx`;

  return new NextResponse(outputBuffer as unknown as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(outputBuffer.length),
    },
  });
}

export const GET = withAccess({ module: "linear-risk", permission: "X", submoduleCode: "generate_report" }, async (request, _context, access) => {
  return generateReport(request, access);
});

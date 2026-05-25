import { NextResponse } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';
import { resolveEffectiveCompanyId } from '@/infrastructure/db/prisma/resolveEffectiveCompanyId';
import { withAccess } from '@/core/permissions/http/withAccess';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const asText = (value: unknown) => String(value ?? '').trim();
const asUuid = (value: unknown) => {
  const parsed = asText(value);
  return UUID.test(parsed) ? parsed : null;
};

function parseJson(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

type RiskLevelRow = {
  id: string;
  code: string;
  name: string;
  min_score: number;
  max_score: number;
  color: string | null;
  sort_order: number | null;
};

async function ensureRunRaAccess(runRaId: string, companyId: string): Promise<boolean> {
  companyId = await resolveEffectiveCompanyId(companyId);
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id::text
    FROM public.run_ra
    WHERE id = ${runRaId}::uuid
      AND company_id = ${companyId}::uuid
    LIMIT 1
  `);
  return Boolean(rows[0]);
}

function resolveRiskLevelByScore(score: number | null, levels: RiskLevelRow[]) {
  if (score == null) return null;
  return levels.find((level) => score >= Number(level.min_score) && score <= Number(level.max_score)) ?? null;
}

export const GET = withAccess({ module: 'linear-risk', permission: 'read' }, async (request, context, access) => {
  const url = new URL(request.url);
  const runRaId = asUuid(url.searchParams.get('runRaId'));
  if (!runRaId) return NextResponse.json({ error: 'runRaId inválido' }, { status: 400 });
  const effectiveCompanyId = await resolveEffectiveCompanyId(access.company.id);

  const hasAccess = await ensureRunRaAccess(runRaId, effectiveCompanyId);
  if (!hasAccess) return NextResponse.json({ error: 'Sin acceso' }, { status: 404 });

  const risks = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT
      r.id::text,
      r.name,
      r.cause,
      r.event,
      r.consequence,
      cat.name AS risk_category,
      a.impact_score::float8,
      a.probability_score::float8,
      a.inherent_risk_score::float8,
      a.residual_risk_score::float8,
      a.calculation_rationale,
      a.id::text AS analysis_id
    FROM public.run_ra_risks r
    LEFT JOIN public.run_ra_risk_analysis a ON a.run_ra_risk_id = r.id
    LEFT JOIN public.catalog_risk_category cat ON cat.id = r.risk_category
    WHERE r.run_ra_id = ${runRaId}::uuid
    ORDER BY r.updated_at DESC
  `);

  const levels = await prisma.$queryRaw<RiskLevelRow[]>(Prisma.sql`
    SELECT
      id::text,
      code,
      name,
      min_score::int,
      max_score::int,
      color,
      sort_order::int
    FROM public.catalog_risk_level
    WHERE is_active = true
    ORDER BY sort_order ASC, min_score ASC
  `);

  if (risks.length === 0) {
    return NextResponse.json({ risks: [], current: null, controls: [], catalogs: {} });
  }

  const risksMapped = risks.map((risk) => {
    const score = risk.inherent_risk_score == null ? null : Number(risk.inherent_risk_score);
    const level = resolveRiskLevelByScore(score, levels);
    return {
      ...risk,
      name: risk.name || risk.event || risk.cause || 'Sin nombre',
      inherent_level_name: level?.name ?? null,
      inherent_level_code: level?.code ?? null,
      inherent_level_color: level?.color ?? null,
    };
  });

  const selectedRiskId = asUuid(url.searchParams.get('riskId')) ?? risksMapped[0].id;
  const current = risksMapped.find((risk) => risk.id === selectedRiskId) ?? risksMapped[0];

  const controlsRows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT
      c.id::text AS control_id,
      c.code,
      c.name,
      c.description,
      c.control_type::text AS control_type,
      c.control_nature::text AS control_nature,
      c.owner_id::text AS owner_id,
      c.frequency::text AS frequency,
      c.source_control_id,
      c.design::float8 AS design,
      c.implementation::float8 AS implementation,
      c.operation::float8 AS operation,
      c.cobertura::float8 AS cobertura,
      c.is_existing,
      c.is_active
    FROM public.run_ra_controls c
    WHERE c.run_ra_id = ${runRaId}::uuid
      AND c.id_risk = ${current.id}::uuid
    ORDER BY c.created_at ASC
  `);

  const [owners, controlTypes, controlNatures, controlFrequencies, controlEffectiveness] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; name: string; last_name: string }>>(Prisma.sql`
      SELECT id::text, COALESCE(name,'') AS name, COALESCE(last_name,'') AS last_name
      FROM public.users
      WHERE company_id = ${effectiveCompanyId}::uuid
        AND is_active = true
      ORDER BY name ASC
    `),
    prisma.$queryRaw<Array<{ id: string; name: string }>>(Prisma.sql`
      SELECT id::text, name
      FROM public.catalog_control_type
      ORDER BY name ASC
    `),
    prisma.$queryRaw<Array<{ id: string; name: string }>>(Prisma.sql`
      SELECT id::text, name
      FROM public.catalog_controls_category
      ORDER BY name ASC
    `),
    prisma.$queryRaw<Array<{ id: string; name: string }>>(Prisma.sql`
      SELECT id::text, name
      FROM public.catalog_controls_frequency
      ORDER BY name ASC
    `),
    prisma.$queryRaw<Array<{ id: string; value: number; code: string | null; name: string }>>(Prisma.sql`
      SELECT id::text, value::int, code, name
      FROM public.catalog_control_effectiveness
      ORDER BY sort_order ASC, value ASC
    `),
  ]);

  const rationale = parseJson(current.calculation_rationale);

  return NextResponse.json({
    risks: risksMapped,
    current: {
      ...current,
      residual_impact: typeof rationale.residual_impact === 'number' ? rationale.residual_impact : null,
      residual_probability: typeof rationale.residual_probability === 'number' ? rationale.residual_probability : null,
      residual_justification: typeof rationale.residual_justification === 'string' ? rationale.residual_justification : '',
    },
    controls: controlsRows.map((control) => ({
      ...control,
      name: control.name || control.code || 'Sin nombre',
      design: Number(control.design ?? 3),
      implementation: Number(control.implementation ?? 3),
      operation: Number(control.operation ?? 3),
      cobertura: Number(control.cobertura ?? 75),
    })),
    catalogs: {
      owners: owners.map((owner) => ({ id: owner.id, name: `${owner.name} ${owner.last_name}`.trim() })),
      control_types: controlTypes,
      control_natures: controlNatures,
      control_frequencies: controlFrequencies,
      control_effectiveness: controlEffectiveness,
      control_coverage: [],
    },
  });
});

export const POST = withAccess({ module: 'linear-risk', permission: 'read' }, async (request, context, access) => {
  const body = (await request.json()) as Record<string, unknown>;
  const runRaId = asUuid(body.runRaId);
  const riskId = asUuid(body.riskId);
  if (!runRaId || !riskId) return NextResponse.json({ error: 'runRaId o riskId inválido' }, { status: 400 });
  const effectiveCompanyId = await resolveEffectiveCompanyId(access.company.id);

  const hasAccess = await ensureRunRaAccess(runRaId, effectiveCompanyId);
  if (!hasAccess) return NextResponse.json({ error: 'Sin acceso' }, { status: 404 });

  if (asText(body.action) === 'create_control') {
    const controlName = asText(body.control_name);
    const controlType = asUuid(body.control_type);
    const controlDescription = asText(body.control_description);
    const controlNature = asUuid(body.control_nature);
    const ownerId = asUuid(body.owner_id);
    const frequency = asUuid(body.frequency);
    const sourceControlId = asText(body.source_control_id) || null;

    if (!controlName) return NextResponse.json({ error: 'control_name es requerido.' }, { status: 400 });
    if (!controlType) return NextResponse.json({ error: 'control_type es requerido.' }, { status: 400 });

    const riskRows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id::text
      FROM public.run_ra_risks
      WHERE id = ${riskId}::uuid
        AND run_ra_id = ${runRaId}::uuid
      LIMIT 1
    `);
    if (!riskRows[0]) return NextResponse.json({ error: 'Riesgo inválido para esta evaluación.' }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        INSERT INTO public.run_ra_controls (
          id, run_ra_id, code, name, description, control_type, control_nature, owner_id, frequency, source_control_id, id_risk, is_existing, is_active, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          ${runRaId}::uuid,
          ${`CTRL-${Date.now().toString().slice(-6)}`},
          ${controlName},
          ${controlDescription || null},
          ${controlType}::uuid,
          ${controlNature ? Prisma.sql`${controlNature}::uuid` : Prisma.sql`NULL`},
          ${ownerId ? Prisma.sql`${ownerId}::uuid` : Prisma.sql`NULL`},
          ${frequency ? Prisma.sql`${frequency}::uuid` : Prisma.sql`NULL`},
          ${sourceControlId},
          ${riskId}::uuid,
          true,
          true,
          now(),
          now()
        )
      `);
    });

    return NextResponse.json({ ok: true, created: true });
  }

  const controls = Array.isArray(body.controls) ? (body.controls as Array<Record<string, unknown>>) : [];
  const residualJustification = asText(body.residualJustification);

  const analysis = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT id::text, impact_score, probability_score, inherent_risk_score, calculation_rationale
    FROM public.run_ra_risk_analysis
    WHERE run_ra_id = ${runRaId}::uuid
      AND run_ra_risk_id = ${riskId}::uuid
    LIMIT 1
  `);
  if (!analysis[0]) return NextResponse.json({ error: 'Riesgo sin análisis base.' }, { status: 400 });

  const analysisId = analysis[0].id;
  const baseImpact = Number(analysis[0].impact_score ?? 1);
  const baseProbability = Number(analysis[0].probability_score ?? 1);

  let sumOverall = 0;
  let count = 0;

  await prisma.$transaction(async (tx) => {
    for (const control of controls) {
      const controlId = asUuid(control.control_id);
      if (!controlId) continue;

      const design = Math.min(5, Math.max(1, Number(control.design ?? 3)));
      const implementation = Math.min(5, Math.max(1, Number(control.implementation ?? 3)));
      const operation = Math.min(5, Math.max(1, Number(control.operation ?? 3)));
      const cobertura = Math.min(100, Math.max(0, Number(control.cobertura ?? 75)));

      const internalEff = (design / 5 * 0.35) + (implementation / 5 * 0.30) + (operation / 5 * 0.35);
      const overall = Number((internalEff * (cobertura / 100)).toFixed(4));

      sumOverall += overall;
      count += 1;

      await tx.$executeRaw(Prisma.sql`
        UPDATE public.run_ra_controls
        SET name = ${asText(control.name)},
            control_type = ${asUuid(control.control_type)}::uuid,
            control_nature = ${asUuid(control.control_nature)}::uuid,
            owner_id = ${asUuid(control.owner_id)}::uuid,
            frequency = ${asUuid(control.frequency)}::uuid,
            design = ${design},
            implementation = ${implementation},
            operation = ${operation},
            cobertura = ${cobertura},
            id_risk = ${riskId}::uuid,
            updated_at = now()
        WHERE id = ${controlId}::uuid
          AND run_ra_id = ${runRaId}::uuid
      `);
    }

    const factor = count > 0 ? sumOverall / count : 0;
    const residualImpact = Math.max(1, Math.round(baseImpact * (1 - 0.30 * factor)));
    const residualProbability = Math.max(1, Math.round(baseProbability * (1 - 0.50 * factor)));
    const prev = parseJson(analysis[0].calculation_rationale);
    const weight = typeof prev.peso_value === 'number' ? prev.peso_value : 1;

    const inherent = Number(analysis[0].inherent_risk_score ?? 0);
    let totalReduction = 0;
    for (const control of controls) {
      const design = Math.min(5, Math.max(1, Number(control.design ?? 3)));
      const implementation = Math.min(5, Math.max(1, Number(control.implementation ?? 3)));
      const operation = Math.min(5, Math.max(1, Number(control.operation ?? 3)));
      const cobertura = Math.min(100, Math.max(0, Number(control.cobertura ?? 75)));

      const internalEff = (design / 5 * 0.35) + (implementation / 5 * 0.30) + (operation / 5 * 0.35);
      const overall = Number((internalEff * (cobertura / 100)).toFixed(4));
      totalReduction += inherent * overall;
    }
    const finalResidual = Math.max(0, inherent - totalReduction);
    const residualScore = Number(finalResidual.toFixed(2));

    const rationale = JSON.stringify({
      ...prev,
      residual_impact: residualImpact,
      residual_probability: residualProbability,
      residual_justification: residualJustification,
      control_avg_effectiveness: Number((factor * 100).toFixed(1)),
    });

    await tx.$executeRaw(Prisma.sql`
      UPDATE public.run_ra_risk_analysis
      SET residual_risk_score = ${residualScore},
          calculation_rationale = ${rationale},
          updated_at = now()
      WHERE id = ${analysisId}::uuid
    `);
  });

  return NextResponse.json({ ok: true });
});

export const DELETE = withAccess({ module: 'linear-risk', permission: 'read' }, async (request, context, access) => {
  const url = new URL(request.url);
  const runRaId = asUuid(url.searchParams.get('runRaId'));
  const riskId = asUuid(url.searchParams.get('riskId'));
  const controlId = asUuid(url.searchParams.get('controlId'));
  if (!runRaId || !riskId || !controlId) {
    return NextResponse.json({ error: 'runRaId, riskId o controlId inválido.' }, { status: 400 });
  }
  const effectiveCompanyId = await resolveEffectiveCompanyId(access.company.id);

  const hasAccess = await ensureRunRaAccess(runRaId, effectiveCompanyId);
  if (!hasAccess) return NextResponse.json({ error: 'Sin acceso' }, { status: 404 });

  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM public.run_ra_controls
    WHERE id = ${controlId}::uuid
      AND run_ra_id = ${runRaId}::uuid
      AND id_risk = ${riskId}::uuid
  `);

  return NextResponse.json({ ok: true });
});

import { Prisma } from "@/generated/prisma/client";
import prisma from "@/infrastructure/db/prisma/client";
import { resolveEffectiveCompanyId } from "@/infrastructure/db/prisma/resolveEffectiveCompanyId";
import {
  LinearRiskRepository,
  LinearRiskDashboardSummary,
  LinearRiskEvaluationsSummary,
  LinearRiskEvaluation,
} from "../../domain/types";

export class PrismaLinearRiskRepository implements LinearRiskRepository {
  private riskAppetiteCatalogExists: boolean | null = null;
  private readonly uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  private asUuid(value: unknown): string | null {
    const str = String(value ?? '').trim();
    return this.uuidPattern.test(str) ? str : null;
  }

  private resolveRiskLevel(
    score: number | null,
    levels: Array<{ code: string; name: string; min_score: number; max_score: number; color: string | null }>
  ) {
    if (score == null) return null;
    return levels.find((level) => score >= Number(level.min_score) && score <= Number(level.max_score)) ?? null;
  }

  private async hasRiskAppetiteCatalog(): Promise<boolean> {
    if (this.riskAppetiteCatalogExists != null) return this.riskAppetiteCatalogExists;

    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'risk_appetite_catalog'
      ) AS exists
    `);

    this.riskAppetiteCatalogExists = Boolean(rows[0]?.exists);
    return this.riskAppetiteCatalogExists;
  }

  private async getUnifiedAppetiteCatalog(): Promise<Array<{ appetite_level: string; tolerance_min: number | null; tolerance_max: number | null }>> {
    const hasRiskAppetiteCatalog = await this.hasRiskAppetiteCatalog();

    const [catalogAppetite, riskAppetiteCatalog] = await Promise.all([
      prisma.$queryRaw<Array<{ appetite_level: string; tolerance_min: number | null; tolerance_max: number | null }>>(Prisma.sql`
        SELECT appetite_level, tolerance_min::float8, tolerance_max::float8
        FROM public.catalog_appetite
        WHERE upper(coalesce(is_active::text, '')) IN ('ACTIVE', 'TRUE', '1', 'YES')
        ORDER BY tolerance_min ASC, appetite_level ASC
      `).catch(() => []),
      hasRiskAppetiteCatalog
        ? prisma.$queryRaw<Array<{ appetite_level: string | null; min_score: number | null; max_score: number | null }>>(Prisma.sql`
            SELECT appetite_level, min_score::float8, max_score::float8
            FROM public.risk_appetite_catalog
            WHERE is_active = true
            ORDER BY sequence_order NULLS LAST, appetite_level NULLS LAST
          `).catch(() => [])
        : Promise.resolve([]),
    ]);

    const merged = new Map<string, { appetite_level: string; tolerance_min: number | null; tolerance_max: number | null }>();

    for (const row of catalogAppetite) {
      const key = String(row.appetite_level ?? '').trim().toLowerCase();
      if (!key) continue;
      merged.set(key, {
        appetite_level: String(row.appetite_level),
        tolerance_min: row.tolerance_min ?? null,
        tolerance_max: row.tolerance_max ?? null,
      });
    }

    for (const row of riskAppetiteCatalog) {
      const key = String(row.appetite_level ?? '').trim().toLowerCase();
      if (!key || merged.has(key)) continue;
      merged.set(key, {
        appetite_level: String(row.appetite_level),
        tolerance_min: row.min_score ?? null,
        tolerance_max: row.max_score ?? null,
      });
    }

    return [...merged.values()].sort((a, b) => Number(a.tolerance_min ?? 0) - Number(b.tolerance_min ?? 0));
  }

  private async resolveAppetiteByValue(appetiteValue: string): Promise<{ appetite_level: string; tolerance_min: number | null; tolerance_max: number | null } | null> {
    if (!appetiteValue.trim()) return null;

    const hasRiskAppetiteCatalog = await this.hasRiskAppetiteCatalog();

    const [catalogMatch, riskCatalogMatch] = await Promise.all([
      prisma.$queryRaw<Array<{ appetite_level: string; tolerance_min: number | null; tolerance_max: number | null }>>(Prisma.sql`
        SELECT appetite_level, tolerance_min::float8, tolerance_max::float8
        FROM public.catalog_appetite
        WHERE lower(replace(appetite_level, ' ', '_')) = lower(${appetiteValue})
           OR lower(appetite_level) = lower(${appetiteValue})
        ORDER BY effective_from DESC NULLS LAST, created_at DESC
        LIMIT 1
      `).catch(() => []),
      hasRiskAppetiteCatalog
        ? prisma.$queryRaw<Array<{ appetite_level: string | null; min_score: number | null; max_score: number | null }>>(Prisma.sql`
            SELECT appetite_level, min_score::float8, max_score::float8
            FROM public.risk_appetite_catalog
            WHERE lower(replace(appetite_level, ' ', '_')) = lower(${appetiteValue})
               OR lower(appetite_level) = lower(${appetiteValue})
            ORDER BY sequence_order NULLS LAST, appetite_level NULLS LAST
            LIMIT 1
          `).catch(() => [])
        : Promise.resolve([]),
    ]);

    if (catalogMatch[0]) {
      return {
        appetite_level: catalogMatch[0].appetite_level,
        tolerance_min: catalogMatch[0].tolerance_min ?? null,
        tolerance_max: catalogMatch[0].tolerance_max ?? null,
      };
    }

    if (riskCatalogMatch[0]?.appetite_level) {
      return {
        appetite_level: String(riskCatalogMatch[0].appetite_level),
        tolerance_min: riskCatalogMatch[0].min_score ?? null,
        tolerance_max: riskCatalogMatch[0].max_score ?? null,
      };
    }

    return null;
  }

  async getDashboardRows(): Promise<LinearRiskDashboardSummary> {
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM views.dashboard_top_control
      ORDER BY systemic_impact_score DESC NULLS LAST
      LIMIT 100
    `);

    return {
      rows,
      source: "dashboard_top_control (view)",
    };
  }

  async getEvaluations(
    companyId: string,
    elementId?: string,
    activityId?: string
  ): Promise<LinearRiskEvaluationsSummary> {
    companyId = await resolveEffectiveCompanyId(companyId);
    console.log('[PrismaLinearRiskRepository] fetching evals for companyId:', companyId);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        r.id::text,
        r.code,
        COALESCE(
          (SELECT ce_obj.objective
           FROM public.run_ra_contexto_evaluacion ce_obj
           WHERE ce_obj.run_ra_id = r.id
           ORDER BY ce_obj.updated_at DESC NULLS LAST
           LIMIT 1),
          'Sin objetivo'
        ) AS title,
        r.description,
        to_char(r.created_at AT TIME ZONE 'UTC', 'DD/MM/YYYY HH24:MI') AS created_at,
        to_char(r.updated_at AT TIME ZONE 'UTC', 'DD/MM/YYYY HH24:MI') AS updated_at,
        (SELECT ce.scope FROM public.run_ra_contexto_evaluacion ce
          WHERE ce.run_ra_id = r.id ORDER BY ce.updated_at DESC NULLS LAST LIMIT 1) AS scope,
        (SELECT COUNT(*) FROM public.run_ra_risks rk WHERE rk.run_ra_id = r.id) AS risk_count,
        (SELECT COUNT(*) FROM public.run_ra_controls rc
          WHERE rc.run_ra_id = r.id AND rc.is_active = true) AS control_count,
        (SELECT COUNT(*) FROM public.run_ra_risk_treatment rt
          JOIN public.run_ra_risks rk2 ON rk2.id = rt.id_risk
          WHERE rk2.run_ra_id = r.id AND rt.is_active = true) AS treatment_count,
        (SELECT COUNT(*) FROM public.run_ra_risks rk3
          WHERE rk3.run_ra_id = r.id AND rk3.id_valoration IS NOT NULL) AS valored_count,
        (SELECT COUNT(*) FROM public.run_ra_contexto_evaluacion ce2
          WHERE ce2.run_ra_id = r.id) AS context_count,
        (SELECT COUNT(*) FROM public.run_ra_risk_analysis ra
          WHERE ra.run_ra_id = r.id) AS analysis_count,
        (SELECT COUNT(*) FROM public.run_ra_evidence ev
          WHERE ev.run_ra_id = r.id) AS evidence_count,
        (
          SELECT cl.code
          FROM public.catalog_ra_lifecycle_history lh
          JOIN public.catalog_ra_lifecycle cl ON cl.id = lh.to_lifecycle_id
          WHERE lh.run_ra_id = r.id
            AND lh.is_current = true
          ORDER BY lh.changed_at DESC
          LIMIT 1
        ) AS lifecycle_code,
        (
          SELECT cl.name
          FROM public.catalog_ra_lifecycle_history lh
          JOIN public.catalog_ra_lifecycle cl ON cl.id = lh.to_lifecycle_id
          WHERE lh.run_ra_id = r.id
            AND lh.is_current = true
          ORDER BY lh.changed_at DESC
          LIMIT 1
        ) AS lifecycle_name,
        (
          SELECT cl.is_terminal
          FROM public.catalog_ra_lifecycle_history lh
          JOIN public.catalog_ra_lifecycle cl ON cl.id = lh.to_lifecycle_id
          WHERE lh.run_ra_id = r.id
            AND lh.is_current = true
          ORDER BY lh.changed_at DESC
          LIMIT 1
        ) AS lifecycle_terminal
      FROM public.run_ra r
      WHERE r.company_id = ${companyId}::uuid
      ${elementId ? Prisma.sql`AND r.id IN (SELECT ce3.run_ra_id FROM public.run_ra_contexto_evaluacion ce3 WHERE ce3.element_id = ${elementId}::uuid)` : Prisma.empty}
      ${activityId ? Prisma.sql`AND r.id IN (SELECT ce4.run_ra_id FROM public.run_ra_contexto_evaluacion ce4 WHERE ce4.activity_id = ${activityId}::uuid)` : Prisma.empty}
      ORDER BY r.created_at DESC
    `);

    console.log('[PrismaLinearRiskRepository] rows found:', rows.length);

    const evaluations: LinearRiskEvaluation[] = rows.map((r) => {
      const contextCount = Number(r.context_count);
      const riskCount = Number(r.risk_count);
      const controlCount = Number(r.control_count);
      const valoredCount = Number(r.valored_count);
      const treatmentCount = Number(r.treatment_count);
      const analysisCount = Number(r.analysis_count);
      const evidenceCount = Number(r.evidence_count);

      let progress = 0;
      if (contextCount > 0) progress += 20;
      if (riskCount > 0) progress += 20;
      if (analysisCount > 0) progress += 20;
      if (controlCount > 0) progress += 20;
      if (evidenceCount > 0) progress += 20;
      progress = Math.min(progress, 100);

      const lifecycleCode = String(r.lifecycle_code ?? "DRAFT");
      let statusLabel: string = lifecycleCode;
      let statusColor: string = "#64748b";
      if (lifecycleCode === "IN_PROGRESS") {
        statusLabel = "EN PROCESO";
        statusColor = "#f59e0b";
      } else if (lifecycleCode === "IN_TREATMENT") {
        statusLabel = "EN TRATAMIENTO";
        statusColor = "#ef4444";
      } else if (lifecycleCode === "COMPLETED") {
        statusLabel = "COMPLETADA";
        statusColor = "#a78bfa";
        progress = 100;
      } else if (lifecycleCode === "CANCELLED") {
        statusLabel = "CANCELADA";
        statusColor = "#f43f5e";
      } else if (lifecycleCode === "REOPENED") {
        statusLabel = "REABIERTA";
        statusColor = "#22d3ee";
      } else if (lifecycleCode === "DELETED") {
        statusLabel = "ELIMINADA";
        statusColor = "#475569";
      } else if (lifecycleCode === "DRAFT") {
        statusLabel = "BORRADOR";
        statusColor = "#64748b";
      }

      const responsible = r.description?.trim() || "";
      const initials =
        responsible
          .split(" ")
          .filter(Boolean)
          .map((w: string) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase() || "??";

      return {
        id: r.id,
        code: r.code || "",
        title: r.title || "Sin objetivo",
        scope: r.scope?.trim() || "",
        responsible,
        initials,
        status: statusLabel,
        status_color: statusColor,
        lifecycle_code: lifecycleCode,
        lifecycle_name: r.lifecycle_name || lifecycleCode,
        lifecycle_terminal: Boolean(r.lifecycle_terminal),
        created_at: r.created_at || "",
        updated_at: r.updated_at || "",
        progress,
      };
    });

    return {
      stats: {
        total: evaluations.length,
        borrador: evaluations.filter((e) => e.status === "BORRADOR").length,
        en_proceso: evaluations.filter((e) => e.status === "EN PROCESO").length,
        finalizada: evaluations.filter((e) => e.status === "COMPLETADA").length,
        en_tratamiento: evaluations.filter((e) => e.status === "EN TRATAMIENTO")
          .length,
      },
      evaluations,
    };
  }

  async createEvaluation(
    companyId: string,
    forceNew = false
  ): Promise<{ id: string; code: string }> {
    companyId = await resolveEffectiveCompanyId(companyId);
    if (!forceNew) {
      const existing = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT id::text, code FROM public.run_ra
        WHERE company_id = ${companyId}::uuid
          AND status <> 'DELETED'
          AND status <> 'COMPLETED'
        ORDER BY created_at DESC
        LIMIT 1
      `);
      if (existing[0]) return existing[0];
    }

    const code = `RA-${Date.now()}`;
    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.run_ra (company_id, code, title, status, version)
        VALUES (${companyId}::uuid, ${code}, 'Nueva evaluación de riesgo', 'DRAFT', 1)
        RETURNING id::text, code
      `);
      const run = rows[0];

      // Get initial lifecycle state
      const stateRows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT id::text FROM public.catalog_ra_lifecycle WHERE code = 'DRAFT' LIMIT 1
      `);
      const stateId = stateRows[0]?.id;

      if (stateId) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO public.catalog_ra_lifecycle_history (
            id, run_ra_id, to_lifecycle_id, change_reason, is_current, changed_at
          ) VALUES (
            gen_random_uuid(), ${run.id}::uuid, ${stateId}::uuid, 'Creación de evaluación', true, now()
          )
        `);
      }

      return run;
    });

    return result;
  }

  async deleteEvaluation(id: string): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
      SELECT public.sp_delete_run_ra_cascade(${id}::uuid, (SELECT company_id FROM public.run_ra WHERE id = ${id}::uuid))
    `);
  }

  async getGeneralContext(runRaId: string, companyId: string): Promise<any> {
    companyId = await resolveEffectiveCompanyId(companyId);
    console.log('[LinearRiskRepository] getGeneralContext:', { runRaId, companyId });
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        gc.*,
        r.object_type,
        r.description
      FROM public.run_ra r
      LEFT JOIN public.run_ra_contexto_evaluacion gc ON gc.run_ra_id = r.id
      WHERE r.id = ${runRaId}::uuid
      LIMIT 1
    `);
    const row = rows[0] ?? null;

    const appetiteCatalog = await this.getUnifiedAppetiteCatalog();

    const [elements, activities] = await Promise.all([
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT id::text, name 
        FROM public.elements 
        WHERE (company_id = ${companyId}::uuid OR company_id IS NULL)
          AND is_active = true 
        ORDER BY name ASC
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT id::text, name, element_id::text 
        FROM public.activities 
        WHERE (company_id = ${companyId}::uuid OR company_id IS NULL)
          AND is_active = true 
        ORDER BY name ASC
      `),
    ]);

    console.log('[LinearRiskRepository] Result counts:', {
      hasRow: !!row,
      appetite: appetiteCatalog.length,
      elements: elements.length,
      activities: activities.length
    });

    return { context: row, appetiteCatalog, elements, activities };
  }

  async upsertGeneralContext(input: any): Promise<void> {
    const assumptionsJson = JSON.stringify(input.assumptions);
    const sourcesJson = JSON.stringify(input.sources);
    
    const objectId = input.activityId || input.elementId || null;
    const objectType = input.activityId ? 'ACTIVITY' : (input.elementId ? 'ELEMENT' : input.objectType);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.run_ra
        SET object_type = ${objectType || null},
            object_id   = ${objectId ? Prisma.sql`${objectId}::uuid` : Prisma.sql`NULL`},
            description = ${input.responsable || null},
            updated_at  = now()
        WHERE id = ${input.runRaId}::uuid
      `);

      const exists = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT 1 FROM public.run_ra_contexto_evaluacion WHERE run_ra_id = ${input.runRaId}::uuid
      `);

      if (exists.length > 0) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.run_ra_contexto_evaluacion
          SET
            objective              = ${input.objective},
            scope                  = ${input.scope},
            inclusions             = ${input.inclusions || null},
            exclusions             = ${input.exclusions || null},
            evaluated_period_start = ${input.periodStart ? Prisma.sql`${input.periodStart}::date` : Prisma.sql`NULL`},
            evaluated_period_end   = ${input.periodEnd ? Prisma.sql`${input.periodEnd}::date` : Prisma.sql`NULL`},
            methodology            = ${input.methodology || null},
            risk_appetite          = ${input.riskAppetite || null},
            element_id             = ${input.elementId ? Prisma.sql`${input.elementId}::uuid` : Prisma.sql`NULL`},
            activity_id            = ${input.activityId ? Prisma.sql`${input.activityId}::uuid` : Prisma.sql`NULL`},
            assumptions            = ${assumptionsJson}::jsonb,
            information_sources    = ${sourcesJson}::jsonb,
            updated_at             = now()
          WHERE run_ra_id = ${input.runRaId}::uuid
        `);
      } else {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO public.run_ra_contexto_evaluacion (
            run_ra_id, objective, scope, inclusions, exclusions,
            evaluated_period_start, evaluated_period_end,
            methodology, assumptions, information_sources,
            risk_appetite, element_id, activity_id,
            created_at, updated_at
          ) VALUES (
            ${input.runRaId}::uuid,
            ${input.objective},
            ${input.scope},
            ${input.inclusions || null},
            ${input.exclusions || null},
            ${input.periodStart ? Prisma.sql`${input.periodStart}::date` : Prisma.sql`NULL`},
            ${input.periodEnd ? Prisma.sql`${input.periodEnd}::date` : Prisma.sql`NULL`},
            ${input.methodology || null},
            ${assumptionsJson}::jsonb,
            ${sourcesJson}::jsonb,
            ${input.riskAppetite || null},
            ${input.elementId ? Prisma.sql`${input.elementId}::uuid` : Prisma.sql`NULL`},
            ${input.activityId ? Prisma.sql`${input.activityId}::uuid` : Prisma.sql`NULL`},
            now(), now()
          )
        `);
      }
    });
  }

  async getInternalExternalContext(runRaId: string, type: string): Promise<any[]> {
    return prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        id::text,
        ra_id::text,
        context_type,
        factor_category,
        factor_name,
        description
      FROM public.run_ra_contexto_interno_externo
      WHERE ra_id = ${runRaId}::uuid
        AND upper(context_type) = ${type.toUpperCase()}
      ORDER BY factor_category
    `);
  }

  async upsertInternalExternalContext(runRaId: string, type: string, values: any[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM public.run_ra_contexto_interno_externo
        WHERE ra_id = ${runRaId}::uuid
          AND upper(context_type) = ${type.toUpperCase()}
      `);

      for (const val of values) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO public.run_ra_contexto_interno_externo (
            id, ra_id, context_type, factor_category, factor_name, description, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), ${runRaId}::uuid, ${type}, ${val.category}, ${val.text}, ${val.text}, now(), now()
          )
        `);
      }
    });
  }

  // --- STEP 2: RISK ANALYSIS ---

  async getRiskAnalysisData(runRaId: string, companyId: string) {
    companyId = await resolveEffectiveCompanyId(companyId);
    const [itemsRaw, impacts, probabilities, pesos, activities, owners, controls, runRaMeta, categories, objectives] = await Promise.all([
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          r.id::text,
          r.name,
          r.description,
          r.risk_category::text        AS risk_category_id,
          cat.name                     AS risk_category,
          r.cause,
          r.event,
          r.consequence,
          r.objective_id::text         AS objective_id,
          r.affected_objective,
          r.activity_id::text,
          r.owner_id::text,
          a.impact_score::float8,
          a.probability_score::float8,
          a.inherent_risk_score::float8,
          a.calculation_rationale
        FROM public.run_ra_risks r
        LEFT JOIN public.run_ra_risk_analysis a   ON a.run_ra_risk_id = r.id
        LEFT JOIN public.catalog_risk_category cat ON cat.id = r.risk_category
        WHERE r.run_ra_id = ${runRaId}::uuid
        ORDER BY r.updated_at DESC
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT catalog_impact_id::text AS id, name, description, ordinal::int, numeric_value::float8 FROM public.catalog_ra_impact WHERE is_active = true ORDER BY ordinal ASC`),
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT catalog_probability_id::text AS id, name, description, ordinal::int, numeric_value::float8 FROM public.catalog_ra_probability WHERE is_active = true ORDER BY ordinal ASC`),
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT id::text AS id, descripcion, peso::float8 FROM public.pesos ORDER BY id ASC`),
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT id::text, name FROM public.activities WHERE (company_id = ${companyId}::uuid OR company_id IS NULL) AND is_active = true ORDER BY name ASC`),
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT id::text, COALESCE(name,'') AS name, COALESCE(last_name,'') AS last_name FROM public.users WHERE company_id = ${companyId}::uuid AND is_active = true ORDER BY name ASC`),
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT id::text, name FROM public.run_ra_controls WHERE run_ra_id = ${runRaId}::uuid AND is_existing = true AND is_active = true ORDER BY name ASC`),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          r.id::text,
          r.code,
          r.object_type,
          r.description,
          gc.scope,
          gc.risk_appetite,
          gc.element_id::text AS element_id,
          gc.activity_id::text AS activity_id,
          el.name AS element_name,
          act.name AS activity_name,
          r.owner_id::text AS owner_id
        FROM public.run_ra r
        LEFT JOIN public.run_ra_contexto_evaluacion gc ON gc.run_ra_id = r.id
        LEFT JOIN public.elements el ON el.id = gc.element_id
        LEFT JOIN public.activities act ON act.id = gc.activity_id
        WHERE r.id = ${runRaId}::uuid
        ORDER BY gc.updated_at DESC NULLS LAST
        LIMIT 1
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT id::text, name FROM public.catalog_risk_category ORDER BY name ASC`),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT objective_id::text AS id, objective_name AS name
        FROM public.company_objective
        WHERE company_id = ${companyId}::uuid
          AND is_active = true
        ORDER BY sequence_order ASC NULLS LAST, objective_name ASC
      `),
    ]);

    const items = itemsRaw.map((i) => {
      let rationale: any = {};
      try {
        rationale = typeof i.calculation_rationale === 'string' ? JSON.parse(i.calculation_rationale) : (i.calculation_rationale || {});
      } catch { rationale = {}; }
      return {
        ...i,
        peso_id: typeof rationale.peso_id === 'number' ? String(rationale.peso_id) : '',
        peso_value: typeof rationale.peso_value === 'number' ? rationale.peso_value : null,
      };
    });

    const riskIds = items.map((x) => x.id);
    const links = riskIds.length
      ? await prisma.$queryRaw<any[]>(Prisma.sql`
          SELECT m.run_ra_risk_id::text AS risk_id, m.run_ra_control_id::text AS control_id
          FROM public.map_run_ra_risk_controls m
          WHERE m.run_ra_risk_id = ANY(${riskIds}::uuid[])
        `)
      : [];

    const controlsByRisk = new Map<string, string[]>();
    for (const l of links) {
      const arr = controlsByRisk.get(l.risk_id) ?? [];
      arr.push(l.control_id);
      controlsByRisk.set(l.risk_id, arr);
    }

    const appetiteValue = String(runRaMeta[0]?.risk_appetite ?? '').trim();
    const appetiteRow = await this.resolveAppetiteByValue(appetiteValue);

    return {
      items: items.map((i) => ({ ...i, control_ids: controlsByRisk.get(i.id) ?? [] })),
      meta: {
        run_ra_id: runRaId,
        run_ra_code: runRaMeta[0]?.code ?? '',
        evaluated_process: runRaMeta[0]?.element_name || runRaMeta[0]?.scope || '',
        evaluated_activity: runRaMeta[0]?.activity_name || '',
        responsible_person: runRaMeta[0]?.description || '',
        risk_appetite: appetiteRow?.appetite_level || appetiteValue,
        appetite_tolerance_min: appetiteRow?.tolerance_min ?? null,
        appetite_tolerance_max: appetiteRow?.tolerance_max ?? null,
      },
      catalogs: {
        impacts,
        probabilities,
        pesos,
        activities,
        owners: owners.map((o) => ({ id: o.id, name: `${o.name} ${o.last_name}`.trim() })),
        controls,
        categories,
        objectives,
      },
    };
  }

  async upsertRisk(runRaId: string, riskData: any, companyId: string, userId: string) {
    companyId = await resolveEffectiveCompanyId(companyId);
    const { id: riskId, name, description, risk_category, cause, event, consequence, objective_id, activity_id, owner_id, impact_id, probability_id, peso_id, control_ids } = riskData;

    const objectiveId = this.asUuid(objective_id);
    const riskCategoryId = this.asUuid(risk_category);
    const ownerId = this.asUuid(owner_id);
    const activityId = this.asUuid(activity_id);
    const existingRiskId = this.asUuid(riskId);
    const impactId = String(impact_id ?? '').trim();
    const probabilityId = String(probability_id ?? '').trim();
    const pesoIdRaw = Number(peso_id);
    const normalizedControlIds = Array.isArray(control_ids)
      ? control_ids.map((ctrlId) => this.asUuid(ctrlId)).filter((ctrlId): ctrlId is string => Boolean(ctrlId))
      : [];

    const defaults = await prisma.$queryRaw<Array<{ activity_id: string | null; owner_id: string | null }>>(Prisma.sql`
      SELECT
        gc.activity_id::text AS activity_id,
        r.owner_id::text AS owner_id
      FROM public.run_ra r
      LEFT JOIN public.run_ra_contexto_evaluacion gc ON gc.run_ra_id = r.id
      WHERE r.id = ${runRaId}::uuid
      LIMIT 1
    `);
    const defaultActivityId = this.asUuid(defaults[0]?.activity_id);
    const defaultOwnerId = this.asUuid(defaults[0]?.owner_id);
    const effectiveActivityId = activityId ?? defaultActivityId;
    const effectiveOwnerId = ownerId ?? defaultOwnerId ?? userId;

    if (!String(name ?? '').trim() || !String(cause ?? '').trim() || !String(event ?? '').trim() || !String(consequence ?? '').trim() || !objectiveId || !effectiveActivityId || !effectiveOwnerId || !impactId || !probabilityId || !Number.isInteger(pesoIdRaw)) {
      throw new Error('Completa nombre, causa, evento, consecuencia, objetivo afectado, impacto, probabilidad y peso. Además define actividad en el paso 1.');
    }

    const objectiveRows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT objective_name FROM public.company_objective
      WHERE objective_id = ${objectiveId}::uuid AND company_id = ${companyId}::uuid AND is_active = true LIMIT 1
    `);
    const affectedObjective = objectiveRows[0]?.objective_name?.trim() ?? '';
    if (!affectedObjective) throw new Error('Objetivo afectado inválido para la compañía.');

    const [impactRows, probRows, pesoRows] = await Promise.all([
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT numeric_value::float8 FROM public.catalog_ra_impact WHERE catalog_impact_id = ${BigInt(impactId)} AND is_active = true LIMIT 1`),
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT numeric_value::float8 FROM public.catalog_ra_probability WHERE catalog_probability_id = ${BigInt(probabilityId)} AND is_active = true LIMIT 1`),
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT id, descripcion, peso::float8 FROM public.pesos WHERE id = ${pesoIdRaw} LIMIT 1`),
    ]);

    const impactValue = impactRows[0]?.numeric_value;
    const probabilityValue = probRows[0]?.numeric_value;
    const peso = pesoRows[0];

    if (impactValue == null || probabilityValue == null || !peso) throw new Error('Impacto, probabilidad o peso inválidos.');

    const inherentScore = impactValue * probabilityValue * Number(peso.peso);
    const rationaleJson = JSON.stringify({
      impact_id: Number(impactId),
      probability_id: Number(probabilityId),
      peso_id: peso.id,
      peso_value: Number(peso.peso),
      peso_descripcion: peso.descripcion,
      formula: 'impacto * probabilidad * peso',
    });

    return await prisma.$transaction(async (tx) => {
      let finalRiskId = existingRiskId;
      if (finalRiskId) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.run_ra_risks
          SET name = ${name}, description = ${description || null}, risk_category = ${riskCategoryId || null}::uuid,
              cause = ${cause}, event = ${event}, consequence = ${consequence}, objective_id = ${objectiveId}::uuid,
              affected_objective = ${affectedObjective}, activity_id = ${effectiveActivityId}::uuid, owner_id = ${effectiveOwnerId}::uuid, updated_at = now()
          WHERE id = ${finalRiskId}::uuid AND run_ra_id = ${runRaId}::uuid
        `);
      } else {
        const rows = await tx.$queryRaw<any[]>(Prisma.sql`
          INSERT INTO public.run_ra_risks (
            id, run_ra_id, code, name, description, risk_category, cause, event, consequence, objective_id, affected_objective, owner_id, activity_id, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), ${runRaId}::uuid, ${`RSK-${Date.now().toString().slice(-6)}`}, ${name}, ${description || null}, ${riskCategoryId || null}::uuid,
            ${cause}, ${event}, ${consequence}, ${objectiveId}::uuid, ${affectedObjective}, ${effectiveOwnerId}::uuid, ${effectiveActivityId}::uuid, now(), now()
          ) RETURNING id::text
        `);
        finalRiskId = rows[0]?.id;
      }

      const analysis = await tx.$queryRaw<any[]>(Prisma.sql`SELECT id::text FROM public.run_ra_risk_analysis WHERE run_ra_id = ${runRaId}::uuid AND run_ra_risk_id = ${finalRiskId}::uuid LIMIT 1`);
      if (analysis[0]?.id) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.run_ra_risk_analysis SET impact_score = ${impactValue}, probability_score = ${probabilityValue}, inherent_risk_score = ${inherentScore}, calculation_rationale = ${rationaleJson}, updated_at = now()
          WHERE id = ${analysis[0].id}::uuid
        `);
      } else {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO public.run_ra_risk_analysis (id, run_ra_id, run_ra_risk_id, impact_score, probability_score, inherent_risk_score, calculation_rationale, created_at, updated_at)
          VALUES (gen_random_uuid(), ${runRaId}::uuid, ${finalRiskId}::uuid, ${impactValue}, ${probabilityValue}, ${inherentScore}, ${rationaleJson}, now(), now())
        `);
      }

      await tx.$executeRaw(Prisma.sql`DELETE FROM public.map_run_ra_risk_controls WHERE run_ra_risk_id = ${finalRiskId}::uuid`);
      for (const ctrlId of normalizedControlIds) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO public.map_run_ra_risk_controls (id, run_ra_risk_id, run_ra_control_id, mitigation_strength, effect_type, reduces_probability, reduces_impact, rationale, created_at, updated_at)
          VALUES (gen_random_uuid(), ${finalRiskId}::uuid, ${ctrlId}::uuid, 1, 'MITIGANTE', true, true, 'Control mitigante existente', now(), now())
        `);
      }
      return finalRiskId;
    });
  }

  async deleteRisk(runRaId: string, riskId: string) {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`DELETE FROM public.map_run_ra_risk_controls WHERE run_ra_risk_id = ${riskId}::uuid`);
      await tx.$executeRaw(Prisma.sql`DELETE FROM public.run_ra_risk_analysis WHERE run_ra_risk_id = ${riskId}::uuid AND run_ra_id = ${runRaId}::uuid`);
      await tx.$executeRaw(Prisma.sql`DELETE FROM public.run_ra_risks WHERE id = ${riskId}::uuid AND run_ra_id = ${runRaId}::uuid`);
    });
  }

  // --- STEP 3: CONTROL ANALYSIS ---

  async getControlAnalysisData(runRaId: string, companyId: string, riskId?: string) {
    companyId = await resolveEffectiveCompanyId(companyId);
    // 1. Get all risks for this evaluation
    const risks = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        r.id::text,
        r.name,
        r.cause,
        r.event,
        ra.inherent_risk_score::float8 AS inherent_score,
        ra.residual_risk_score::float8 AS residual_score
      FROM public.run_ra_risks r
      JOIN public.run_ra_risk_analysis ra ON ra.run_ra_risk_id = r.id
      WHERE r.run_ra_id = ${runRaId}::uuid
      ORDER BY r.created_at ASC
    `);

    // 2. Determine target risk(s)
    const targetRisks = riskId ? risks.filter(r => r.id === riskId) : risks;

    // 3. For each target risk, get its controls and their details
    const risksWithControls = await Promise.all(targetRisks.map(async (r) => {
      const controls = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          c.id::text AS control_id,
          c.name,
          c.description,
          c.control_type::text AS control_type_id,
          c.control_nature::text AS control_nature_id,
          c.owner_id::text AS owner_id,
          c.frequency::text AS frequency_id,
          c.design::float8,
          c.implementation::float8,
          c.operation::float8,
          c.cobertura::float8,
          m.mitigation_strength::float8
        FROM public.map_run_ra_risk_controls m
        JOIN public.run_ra_controls c ON c.id = m.run_ra_control_id
        WHERE m.run_ra_risk_id = ${r.id}::uuid
      `);

      return {
        ...r,
        controls
      };
    }));

    // 4. Load Catalogs
    const [controlTypes, controlNatures, frequencies, owners] = await Promise.all([
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT id::text, name FROM public.catalog_control_type`),
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT id::text, name FROM public.catalog_controls_category WHERE is_active = true`),
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT id::text, name FROM public.catalog_controls_frequency WHERE is_active = true`),
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT id::text, name FROM public.users WHERE company_id = ${companyId}::uuid AND is_active = true`),
    ]);

    return {
      risks: risksWithControls,
      allRisks: risks,
      catalogs: {
        controlTypes,
        controlNatures,
        frequencies,
        owners
      }
    };
  }

  async upsertControlAnalysis(runRaId: string, riskId: string, data: any) {
    const { residualJustification, controls } = data;

    await prisma.$transaction(async (tx) => {
      // Update residual justification in analysis
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.run_ra_risk_analysis
        SET residual_justification = ${residualJustification},
            updated_at = now()
        WHERE run_ra_id = ${runRaId}::uuid AND run_ra_risk_id = ${riskId}::uuid
      `);

      // Update control mappings and the controls themselves
      for (const c of controls) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.run_ra_controls
          SET name = ${c.name},
              control_type = ${c.control_type || null}::uuid,
              control_nature = ${c.control_nature || null}::uuid,
              owner_id = ${c.owner_id || null}::uuid,
              frequency = ${c.frequency || null}::uuid,
              design = ${c.design || 0},
              implementation = ${c.implementation || 0},
              operation = ${c.operation || 0},
              cobertura = ${c.cobertura || 0},
              updated_at = now()
          WHERE id = ${c.control_id}::uuid
        `);
      }

      // Re-calculate residual risk for this risk
      const analysis = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT inherent_risk_score::float8 FROM public.run_ra_risk_analysis
        WHERE run_ra_id = ${runRaId}::uuid AND run_ra_risk_id = ${riskId}::uuid
      `);
      const inherent = Number(analysis[0]?.inherent_risk_score ?? 0);

      const mappings = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT c.design::float8, c.implementation::float8, c.operation::float8, c.cobertura::float8
        FROM public.map_run_ra_risk_controls m
        JOIN public.run_ra_controls c ON c.id = m.run_ra_control_id
        WHERE m.run_ra_risk_id = ${riskId}::uuid
      `);

      let totalReduction = 0;
      for (const m of mappings) {
        const eff = (
          (Number(m.design || 3) / 5 * 0.35) +
          (Number(m.implementation || 3) / 5 * 0.30) +
          (Number(m.operation || 3) / 5 * 0.35)
        ) * (Number(m.cobertura || 75) / 100);
        totalReduction += (inherent * eff);
      }

      const finalResidual = Math.max(0, inherent - totalReduction);

      await tx.$executeRaw(Prisma.sql`
        UPDATE public.run_ra_risk_analysis
        SET residual_risk_score = ${finalResidual},
            updated_at = now()
        WHERE run_ra_id = ${runRaId}::uuid AND run_ra_risk_id = ${riskId}::uuid
      `);
    });
  }

  async createNewControlForRisk(runRaId: string, riskId: string, controlData: any) {
    return await prisma.$transaction(async (tx) => {
      const controlIdRows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.run_ra_controls (
          id, run_ra_id, name, description, control_type, control_nature, owner_id, frequency, is_existing, is_active,
          design, implementation, operation, cobertura, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), ${runRaId}::uuid, ${controlData.control_name}, ${controlData.control_description || ''},
          ${controlData.control_type}::uuid, ${controlData.control_nature || null}::uuid, ${controlData.owner_id || null}::uuid,
          ${controlData.frequency || null}::uuid, true, true,
          3, 3, 3, 75, now(), now()
        ) RETURNING id::text
      `);
      const controlId = controlIdRows[0].id;

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO public.map_run_ra_risk_controls (
          id, run_ra_risk_id, run_ra_control_id, mitigation_strength, effect_type, reduces_probability, reduces_impact, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), ${riskId}::uuid, ${controlId}::uuid, 1, 'MITIGANTE', true, true, now(), now()
        )
      `);
      return controlId;
    });
  }

  async deleteControlMapping(runRaId: string, riskId: string, controlId: string) {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM public.map_run_ra_risk_controls
        WHERE run_ra_risk_id = ${riskId}::uuid AND run_ra_control_id = ${controlId}::uuid
      `);
    });
  }

  // --- STEP 4: RISK VALUATION ---

  async getRiskValuationData(runRaId: string, companyId: string) {
    companyId = await resolveEffectiveCompanyId(companyId);
    const [risksRaw, controlsDirect, controlsMapped, levels, metaRows, valorationCatalog, ownersRaw] = await Promise.all([
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          r.id::text,
          COALESCE(r.code, '') AS code,
          COALESCE(NULLIF(trim(r.name), ''), NULLIF(trim(r.event), ''), NULLIF(trim(r.cause), ''), 'Riesgo sin título') AS risk,
          r.cause,
          r.event,
          r.activity_id::text,
          a.name AS activity,
          r.id_valoration::text AS id_valoration,
          ra.inherent_risk_score::float8 AS inherent_score,
          ra.residual_risk_score::float8 AS residual_score,
          ra.calculation_rationale,
          r.owner_id::text AS owner_id,
          ra.impact_score::float8 AS impact_score,
          ra.probability_score::float8 AS probability_score
        FROM public.run_ra_risks r
        LEFT JOIN public.run_ra_risk_analysis ra ON ra.run_ra_risk_id = r.id
        LEFT JOIN public.activities a ON a.id = r.activity_id
        WHERE r.run_ra_id = ${runRaId}::uuid
        ORDER BY r.updated_at DESC NULLS LAST, r.created_at ASC
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          c.id::text AS control_id,
          c.id_risk::text AS risk_id,
          COALESCE(c.name, 'Control sin nombre') AS name,
          c.design::float8,
          c.implementation::float8,
          c.operation::float8,
          c.cobertura::float8
        FROM public.run_ra_controls c
        WHERE c.run_ra_id = ${runRaId}::uuid
          AND c.is_active = true
          AND c.id_risk IS NOT NULL
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          c.id::text AS control_id,
          m.run_ra_risk_id::text AS risk_id,
          COALESCE(c.name, 'Control sin nombre') AS name,
          c.design::float8,
          c.implementation::float8,
          c.operation::float8,
          c.cobertura::float8
        FROM public.map_run_ra_risk_controls m
        JOIN public.run_ra_controls c ON c.id = m.run_ra_control_id
        WHERE c.run_ra_id = ${runRaId}::uuid
          AND c.is_active = true
      `).catch(() => []),
      prisma.$queryRaw<Array<{ code: string; name: string; min_score: number; max_score: number; color: string | null }>>(Prisma.sql`
        SELECT code, name, min_score::int, max_score::int, color
        FROM public.catalog_risk_level
        WHERE is_active = true
        ORDER BY sort_order ASC NULLS LAST, min_score ASC
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          rr.id::text,
          rr.code,
          rr.object_type,
          ce.scope,
          ce.risk_appetite
        FROM public.run_ra rr
        LEFT JOIN public.run_ra_contexto_evaluacion ce ON ce.run_ra_id = rr.id
        WHERE rr.id = ${runRaId}::uuid
          AND rr.company_id = ${companyId}::uuid
        ORDER BY ce.updated_at DESC NULLS LAST
        LIMIT 1
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT id::text, COALESCE(decision, id::text) AS label
        FROM public.catalog_ra_valoration
        WHERE is_active = true
        ORDER BY label ASC
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT id::text, COALESCE(name, '') AS name, COALESCE(last_name, '') AS last_name
        FROM public.users
        WHERE company_id = ${companyId}::uuid
          AND is_active = true
        ORDER BY name ASC, last_name ASC
      `),
    ]);

    const controlsByRisk = new Map<string, Array<{
      id: string;
      name: string;
      design: number | null;
      implementation: number | null;
      operation: number | null;
      cobertura: number | null;
    }>>();

    for (const raw of [...controlsDirect, ...controlsMapped]) {
      const riskId = String(raw.risk_id ?? '').trim();
      const controlId = String(raw.control_id ?? '').trim();
      if (!riskId || !controlId) continue;
      const existing = controlsByRisk.get(riskId) ?? [];
      if (existing.some((c) => c.id === controlId)) continue;
      existing.push({
        id: controlId,
        name: String(raw.name ?? 'Control sin nombre'),
        design: raw.design ?? null,
        implementation: raw.implementation ?? null,
        operation: raw.operation ?? null,
        cobertura: raw.cobertura ?? null,
      });
      controlsByRisk.set(riskId, existing);
    }

    const risks = risksRaw.map((riskRow) => {
      const controls = controlsByRisk.get(String(riskRow.id)) ?? [];
      const inherent = Number(riskRow.inherent_score ?? 0);

      let residual = Number(riskRow.residual_score ?? 0);
      if (!Number.isFinite(residual)) residual = 0;

      if (residual === 0 && controls.length > 0 && inherent > 0) {
        let reduction = 0;
        for (const control of controls) {
          const internalEff =
            (Number(control.design ?? 3) / 5) * 0.35 +
            (Number(control.implementation ?? 3) / 5) * 0.30 +
            (Number(control.operation ?? 3) / 5) * 0.35;
          const coverage = Number(control.cobertura ?? 75) / 100;
          reduction += inherent * (internalEff * coverage);
        }
        reduction = Math.min(reduction, inherent);
        residual = Math.max(0, inherent - reduction);
      }

      const reductionScore = Math.max(0, inherent - residual);
      const reductionPercent = inherent > 0 ? (reductionScore / inherent) * 100 : 0;
      const inherentLevel = this.resolveRiskLevel(inherent, levels);
      const residualLevel = this.resolveRiskLevel(residual, levels);
      let rationale: Record<string, unknown> = {};
      if (typeof riskRow.calculation_rationale === 'string') {
        try {
          rationale = JSON.parse(riskRow.calculation_rationale || '{}') as Record<string, unknown>;
        } catch {
          rationale = {};
        }
      } else if (riskRow.calculation_rationale && typeof riskRow.calculation_rationale === 'object') {
        rationale = riskRow.calculation_rationale as Record<string, unknown>;
      }

      const ownerMatch = ownersRaw.find((o) => o.id === riskRow.owner_id);
      const ownerName = ownerMatch ? `${ownerMatch.name} ${ownerMatch.last_name}`.trim() : '';

      return {
        id: String(riskRow.id),
        code: String(riskRow.code ?? ''),
        risk: String(riskRow.risk ?? 'Riesgo sin título'),
        cause: riskRow.cause ?? null,
        activity: riskRow.activity ?? null,
        controls: controls.map((control) => ({ id: control.id, name: control.name })),
        reduction_score: Number(reductionScore.toFixed(2)),
        reduction_percent: Number(reductionPercent.toFixed(1)),
        residual_score: Number(residual.toFixed(2)),
        residual_level: residualLevel?.name ?? null,
        residual_level_color: residualLevel?.color ?? null,
        inherent_score: Number(inherent.toFixed(2)),
        inherent_level: inherentLevel?.name ?? null,
        inherent_level_color: inherentLevel?.color ?? null,
        weight: Number(rationale?.peso_value ?? 0) || 0,
        id_valoration: riskRow.id_valoration ?? null,
        owner_id: riskRow.owner_id ?? null,
        owner: ownerName || '-',
        impact_score: riskRow.impact_score ? Number(riskRow.impact_score) : null,
        probability_score: riskRow.probability_score ? Number(riskRow.probability_score) : null,
        residual_impact_pos: rationale?.residual_impact ? Number(rationale.residual_impact) : null,
        residual_probability_pos: rationale?.residual_probability ? Number(rationale.residual_probability) : null,
      };
    });

    const total_inherent = Number(risks.reduce((acc, r) => acc + Number(r.inherent_score || 0), 0).toFixed(2));
    const total_residual = Number(risks.reduce((acc, r) => acc + Number(r.residual_score || 0), 0).toFixed(2));
    const total_reduction = Number((total_inherent - total_residual).toFixed(2));
    const total_reduction_percent = total_inherent > 0 ? Number(((total_reduction / total_inherent) * 100).toFixed(1)) : 0;

    const appetiteValue = String(metaRows[0]?.risk_appetite ?? '').trim();
    const appetiteRow = await this.resolveAppetiteByValue(appetiteValue);

    return {
      meta: {
        run_ra_code: metaRows[0]?.code ?? '',
        evaluated_process: metaRows[0]?.object_type || metaRows[0]?.scope || '',
        risk_appetite: appetiteRow?.appetite_level || appetiteValue,
        appetite_tolerance_min: appetiteRow?.tolerance_min ?? null,
        appetite_tolerance_max: appetiteRow?.tolerance_max ?? null,
      },
      summary: { total_inherent, total_residual, total_reduction, total_reduction_percent },
      risks,
      catalogs: {
        valoration: valorationCatalog,
        owners: ownersRaw.map((owner: { id: string; name: string; last_name: string }) => ({
          id: owner.id,
          name: `${owner.name} ${owner.last_name}`.trim(),
        })),
      },
    };
  }

  async updateRiskValuation(runRaId: string, riskId: string, valorationId: string | null) {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE public.run_ra_risks
      SET id_valoration = ${valorationId}::uuid,
          updated_at = now()
      WHERE run_ra_id = ${runRaId}::uuid AND id = ${riskId}::uuid
    `);
  }

  // --- STEP 5: RISK TREATMENT ---

  async getRiskTreatmentActions(runRaId: string, riskId: string) {
    return await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        id::text,
        treatment_action,
        responsible_id::text,
        due_date::text AS target_date,
        monitoring_required AS requires_reevaluation,
        COALESCE(id_valoration::text, 'Pendiente') AS status
      FROM public.run_ra_risk_treatment
      WHERE id_risk = ${riskId}::uuid
        AND is_active = true
        AND EXISTS (
          SELECT 1
          FROM public.run_ra_risks r
          WHERE r.id = ${riskId}::uuid
            AND r.run_ra_id = ${runRaId}::uuid
        )
      ORDER BY created_at ASC
    `);
  }

  async upsertRiskTreatmentAction(runRaId: string, riskId: string, actionData: any) {
    const { id, action, responsible_id, due_date, monitored, status } = actionData;
    const validRisk = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id::text
      FROM public.run_ra_risks
      WHERE id = ${riskId}::uuid
        AND run_ra_id = ${runRaId}::uuid
      LIMIT 1
    `);
    if (!validRisk[0]) throw new Error('Riesgo inválido para esta evaluación.');

    const resolvedValorationId =
      typeof status === 'string' && status && status !== 'Pendiente' && /^[0-9a-f-]{36}$/i.test(status)
        ? status
        : null;

    const fallbackValoration = resolvedValorationId
      ? null
      : await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT id::text
          FROM public.catalog_ra_valoration
          ORDER BY id ASC
          LIMIT 1
        `);
    const finalValorationId = resolvedValorationId ?? fallbackValoration?.[0]?.id ?? null;
    if (!finalValorationId) throw new Error('No hay opciones de valoración configuradas.');

    if (id) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE public.run_ra_risk_treatment
        SET treatment_action = ${action},
            responsible_id = ${responsible_id || null}::uuid,
            due_date = ${due_date || null}::date,
            monitoring_required = ${monitored},
            id_valoration = ${finalValorationId}::uuid,
            updated_at = now()
        WHERE id = ${id}::uuid
          AND id_risk = ${riskId}::uuid
      `);
      return id;
    } else {
      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.run_ra_risk_treatment (
          id, id_risk, id_valoration, treatment_action, responsible_id, due_date, monitoring_required, is_active, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), ${riskId}::uuid, ${finalValorationId}::uuid, ${action}, ${responsible_id || null}::uuid,
          ${due_date || null}::date, ${monitored}, true, now(), now()
        ) RETURNING id::text
      `);
      return rows[0].id;
    }
  }

  async deleteRiskTreatmentAction(runRaId: string, id: string) {
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM public.run_ra_risk_treatment t
      USING public.run_ra_risks r
      WHERE t.id = ${id}::uuid
        AND r.id = t.id_risk
        AND r.run_ra_id = ${runRaId}::uuid
    `);
  }

  // --- LIFECYCLE STATE TRANSITION ---

  async transitionLifecycleState(input: {
    runRaId: string;
    companyId: string;
    changedBy: string;
    toCode: string;
    changeReason?: string | null;
    completionReason?: string | null;
  }): Promise<void> {
    const { runRaId, companyId, changedBy, toCode, changeReason, completionReason } = input;
    const effectiveCompanyId = await resolveEffectiveCompanyId(companyId);

    // 1. Resolve target lifecycle state
    const stateRows = await prisma.$queryRaw<{ id: string; code: string }[]>(Prisma.sql`
      SELECT id::text, code
      FROM public.catalog_ra_lifecycle
      WHERE code = ${toCode}
      LIMIT 1
    `);
    if (!stateRows[0]) throw new Error(`Lifecycle state not found: ${toCode}`);
    const toState = stateRows[0];

    // 2. Verify run_ra ownership
    const runRows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id::text
      FROM public.run_ra
      WHERE id = ${runRaId}::uuid
        AND company_id = ${effectiveCompanyId}::uuid
      LIMIT 1
    `);
    if (!runRows[0]) throw new Error('run_ra not found or access denied');

    // 3. Get current lifecycle entry
    const current = await prisma.$queryRaw<{ id: string; to_lifecycle_id: string }[]>(Prisma.sql`
      SELECT id::text, to_lifecycle_id::text
      FROM public.catalog_ra_lifecycle_history
      WHERE run_ra_id = ${runRaId}::uuid
        AND is_current = true
      ORDER BY changed_at DESC
      LIMIT 1
    `);

    const currentTo = current[0]?.to_lifecycle_id ?? null;

    // 4. If already in the target state, just touch updated_at
    if (currentTo && currentTo === toState.id) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE public.run_ra SET updated_at = now() WHERE id = ${runRaId}::uuid
      `);
      return;
    }

    // 5. Transition within a transaction
    await prisma.$transaction(async (tx) => {
      // Mark previous entry as not current
      if (current[0]) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.catalog_ra_lifecycle_history
          SET is_current = false
          WHERE id = ${current[0].id}::uuid
        `);
      }

      // Insert new lifecycle history entry
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO public.catalog_ra_lifecycle_history (
          id, run_ra_id, from_lifecycle_id, to_lifecycle_id,
          change_reason, completion_reason, changed_by, changed_at, is_current
        ) VALUES (
          gen_random_uuid(),
          ${runRaId}::uuid,
          ${currentTo ? Prisma.sql`${currentTo}::uuid` : Prisma.sql`NULL`},
          ${toState.id}::uuid,
          ${changeReason ?? null},
          ${completionReason ?? null},
          ${changedBy}::uuid,
          now(),
          true
        )
      `);

      // Update run_ra.status
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.run_ra
        SET status = ${toCode}, updated_at = now()
        WHERE id = ${runRaId}::uuid
      `);
    });
  }
}

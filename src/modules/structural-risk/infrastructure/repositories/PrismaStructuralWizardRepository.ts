import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';
import { resolveEffectiveCompanyId } from '@/infrastructure/db/prisma/resolveEffectiveCompanyId';
import type {
  CreateRunInput,
  IStructuralWizardRepository,
  LifecycleHistoryRow,
  UpdateRunInput,
  UpsertDependencyInput,
  UpsertRiskCascadeInput,
  UpsertSharedResourceInput,
  WizardActivityRow,
  WizardCatalogOption,
  WizardCatalogRow,
  WizardCatalogs,
  WizardDependencyRow,
  WizardLinearControlRow,
  WizardLinearRiskRow,
  WizardPersonRow,
  WizardRiskCascadeRow,
  WizardRunRow,
  WizardSharedResourceRow,
} from '@/modules/structural-risk/domain/contracts/IStructuralWizardRepository';

export class PrismaStructuralWizardRepository implements IStructuralWizardRepository {

  // ── Catalogs ──────────────────────────────────────────────────────────────

  async getCatalogs(): Promise<WizardCatalogs> {
    const [lifecycle, scopeTypes, methodologies] = await Promise.all([
      prisma.$queryRaw<WizardCatalogOption[]>(Prisma.sql`
        SELECT id::text, code, name, description, sort_order
        FROM public.graph_catalog_run_lifecycle
        WHERE is_active = true
        ORDER BY sort_order ASC, name ASC
      `),
      prisma.$queryRaw<WizardCatalogOption[]>(Prisma.sql`
        SELECT id::text, code, name, description, sort_order
        FROM public.graph_catalog_run_scope_type
        WHERE is_active = true
        ORDER BY sort_order ASC, name ASC
      `),
      prisma.$queryRaw<WizardCatalogOption[]>(Prisma.sql`
        SELECT id::text, code, name, description, sort_order
        FROM public.graph_catalog_run_methodology
        WHERE is_active = true
        ORDER BY sort_order ASC, name ASC
      `),
    ]);
    return { lifecycle, scopeTypes, methodologies };
  }

  // ── Runs ──────────────────────────────────────────────────────────────────

  async getRunsByCompany(companyId: string): Promise<WizardRunRow[]> {
    companyId = await resolveEffectiveCompanyId(companyId);
    return prisma.$queryRaw<WizardRunRow[]>(Prisma.sql`
      SELECT
        r.id::text,
        r.code,
        r.title,
        r.scope_type,
        r.methodology,
        r.status,
        r.version,
        to_char(r.assessment_date, 'YYYY-MM-DD') AS assessment_date,
        to_char(r.created_at, 'YYYY-MM-DD HH24:MI') AS created_at,
        to_char(r.updated_at, 'YYYY-MM-DD HH24:MI') AS updated_at,
        h.to_lifecycle_id::text AS lifecycle_id,
        l.code AS lifecycle_code,
        l.name AS lifecycle_name
      FROM public.graph_run_sa r
      LEFT JOIN public.graph_run_lifecycle_history h
        ON h.run_sa_id = r.id AND h.is_current = true
      LEFT JOIN public.graph_catalog_run_lifecycle l
        ON l.id = h.to_lifecycle_id
      WHERE r.company_id = ${companyId}::uuid
      ORDER BY r.updated_at DESC
    `);
  }

  async getLifecycleHistory(runSaId: string): Promise<LifecycleHistoryRow[]> {
    return prisma.$queryRaw<LifecycleHistoryRow[]>(Prisma.sql`
      SELECT
        h.id::text,
        to_char(h.changed_at, 'YYYY-MM-DD HH24:MI') AS changed_at,
        h.progress_percent::float8 AS progress_percent,
        h.change_reason,
        h.completion_reason,
        lf.code AS from_lifecycle_code,
        lt.code AS to_lifecycle_code,
        lt.name AS to_lifecycle_name,
        trim(concat_ws(' ', u.name, u.last_name)) AS changed_by_name
      FROM public.graph_run_lifecycle_history h
      LEFT JOIN public.graph_catalog_run_lifecycle lf ON lf.id = h.from_lifecycle_id
      LEFT JOIN public.graph_catalog_run_lifecycle lt ON lt.id = h.to_lifecycle_id
      LEFT JOIN public.security_users u ON u.id = h.changed_by
      WHERE h.run_sa_id = ${runSaId}::uuid
      ORDER BY h.changed_at DESC
    `);
  }

  async verifyRun(runSaId: string, companyId: string): Promise<WizardRunRow | null> {
    companyId = await resolveEffectiveCompanyId(companyId);
    const rows = await prisma.$queryRaw<Array<{ id: string; code: string }>>(Prisma.sql`
      SELECT id::text, code
      FROM public.graph_run_sa
      WHERE id = ${runSaId}::uuid AND company_id = ${companyId}::uuid
      LIMIT 1
    `);
    return (rows[0] as WizardRunRow | undefined) ?? null;
  }

  async getLinearContextFromEval(fromLinearEvalId: string): Promise<Array<{ objective: string | null; scope: string | null; activity_id: string | null }>> {
    return prisma.$queryRaw(Prisma.sql`
      SELECT objective, scope, activity_id::text
      FROM public.run_ra_contexto_evaluacion
      WHERE run_ra_id = ${fromLinearEvalId}::uuid
    `);
  }

  async createRun(input: CreateRunInput): Promise<{ id: string; code: string }> {
    const companyId = await resolveEffectiveCompanyId(input.companyId);
    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string; code: string }>>(Prisma.sql`
        INSERT INTO public.graph_run_sa (
          id, company_id, code, title, scope_type, methodology, model_version, status, created_by, assessment_date, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          ${companyId}::uuid,
          ${input.code},
          ${input.title},
          ${input.scopeCode},
          ${input.methodologyCode},
          'v1',
          ${input.lifecycleCode},
          ${input.userId}::uuid,
          CURRENT_DATE,
          now(), now()
        )
        RETURNING id::text, code
      `);
      const run = rows[0]!;

      for (const activityId of input.fromLinearActivities) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO public.graph_map_run_sa_activities (
            id, company_id, run_sa_id, activity_id, selected_by, selected_at, is_active, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), ${companyId}::uuid, ${run.id}::uuid, ${activityId}::uuid,
            ${input.userId}::uuid, now(), true, now(), now()
          )
          ON CONFLICT (run_sa_id, activity_id) DO NOTHING
        `);
      }

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO public.graph_run_lifecycle_history (
          id, run_sa_id, from_lifecycle_id, to_lifecycle_id, progress_percent,
          change_reason, completion_reason, changed_by, changed_at, is_current, metadata
        ) VALUES (
          gen_random_uuid(), ${run.id}::uuid, NULL, ${input.lifecycleId}::uuid,
          0, 'Creación inicial del run estructural', NULL,
          ${input.userId}::uuid, now(), true,
          jsonb_build_object('source', 'wizard_structural_base')
        )
      `);

      return run;
    });
  }

  async updateRun(input: UpdateRunInput): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const titleVal   = String(input.title ?? '').trim() || null;
      const scopeVal   = String(input.scope_type ?? '').trim() || null;
      const methodVal  = String(input.methodology ?? '').trim() || null;

      await tx.$executeRaw(Prisma.sql`
        UPDATE public.graph_run_sa
        SET
          title = COALESCE(${titleVal}, title),
          scope_type = COALESCE(${scopeVal}, scope_type),
          methodology = COALESCE(${methodVal}, methodology),
          updated_at = now()
        WHERE id = ${input.runSaId}::uuid
      `);

      if (input.lifecycleId) {
        const lifecycleRows = await tx.$queryRaw<Array<{ id: string; code: string }>>(Prisma.sql`
          SELECT id::text, code
          FROM public.graph_catalog_run_lifecycle
          WHERE id = ${input.lifecycleId}::uuid AND is_active = true
          LIMIT 1
        `);
        const lifecycle = lifecycleRows[0];
        if (!lifecycle) throw new Error('Lifecycle inválido');

        const currentRows = await tx.$queryRaw<Array<{ id: string; to_lifecycle_id: string }>>(Prisma.sql`
          SELECT id::text, to_lifecycle_id::text
          FROM public.graph_run_lifecycle_history
          WHERE run_sa_id = ${input.runSaId}::uuid AND is_current = true
          ORDER BY changed_at DESC LIMIT 1
        `);
        const current = currentRows[0];

        if (!current || current.to_lifecycle_id !== lifecycle.id) {
          if (current) {
            await tx.$executeRaw(Prisma.sql`
              UPDATE public.graph_run_lifecycle_history SET is_current = false WHERE id = ${current.id}::uuid
            `);
          }
          await tx.$executeRaw(Prisma.sql`
            INSERT INTO public.graph_run_lifecycle_history (
              id, run_sa_id, from_lifecycle_id, to_lifecycle_id, progress_percent,
              change_reason, completion_reason, changed_by, changed_at, is_current, metadata
            ) VALUES (
              gen_random_uuid(), ${input.runSaId}::uuid,
              ${current ? Prisma.sql`${current.to_lifecycle_id}::uuid` : Prisma.sql`NULL`},
              ${lifecycle.id}::uuid, 0,
              ${String(input.changeReason ?? '').trim() || 'Cambio de estado desde wizard estructural'},
              NULL, ${input.userId}::uuid, now(), true,
              jsonb_build_object('source', 'wizard_structural_base')
            )
          `);
          await tx.$executeRaw(Prisma.sql`
            UPDATE public.graph_run_sa SET status = ${lifecycle.code}, updated_at = now() WHERE id = ${input.runSaId}::uuid
          `);
        }
      }
    });
  }

  async deleteRun(runSaId: string, companyId: string, userId: string): Promise<boolean> {
    void userId;
    companyId = await resolveEffectiveCompanyId(companyId);

    return prisma.$transaction(async (tx) => {
      const owned = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id::text
        FROM public.graph_run_sa
        WHERE id = ${runSaId}::uuid
          AND company_id = ${companyId}::uuid
        LIMIT 1
      `);
      if (!owned[0]?.id) return false;

      // El esquema actual no tiene el stored procedure legado de la fuente.
      // Eliminamos el run por sus tablas reales asociadas y luego el owner row.
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM public.graph_control_evidence
        WHERE run_id = ${runSaId}::uuid
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM public.graph_control_hardgate
        WHERE run_id = ${runSaId}::uuid
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM public.graph_risk_cascade
        WHERE run_sa_id = ${runSaId}::uuid
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM public.graph_run_lifecycle_history
        WHERE run_sa_id = ${runSaId}::uuid
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM public.graph_map_run_sa_activities
        WHERE run_sa_id = ${runSaId}::uuid
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM public.graph_run_sa
        WHERE id = ${runSaId}::uuid
          AND company_id = ${companyId}::uuid
      `);

      return true;
    });
  }

  // ── Activities ────────────────────────────────────────────────────────────

  async bridgeTableExists(): Promise<boolean> {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
      SELECT to_regclass('public.graph_map_run_sa_activities') IS NOT NULL AS exists
    `);
    return Boolean(rows[0]?.exists);
  }

  async getSelectedActivities(runSaId: string, companyId: string): Promise<string[]> {
    companyId = await resolveEffectiveCompanyId(companyId);
    const rows = await prisma.$queryRaw<Array<{ activity_id: string }>>(Prisma.sql`
      SELECT activity_id::text
      FROM public.graph_map_run_sa_activities
      WHERE run_sa_id = ${runSaId}::uuid AND company_id = ${companyId}::uuid AND is_active = true
      ORDER BY updated_at DESC
    `);
    return rows.map((r) => r.activity_id);
  }

  async getActivitiesData(companyId: string, runSaId: string) {
    companyId = await resolveEffectiveCompanyId(companyId);
    const [
      activities, people, resources, effects, strengths, alternatives,
      dependencies, sharedResources, linearRiskContext, cascadeCatalog,
      resourceCatalog, riskCascades, impacts, criticalities, linearControlContext,
    ] = await Promise.all([
      prisma.$queryRaw<WizardActivityRow[]>(Prisma.sql`
        SELECT
          a.id::text, a.company_id::text, a.element_id::text, a.code, a.name, a.description,
          e.name AS element_name,
          COALESCE(
            (SELECT NULLIF(rr.description, '') FROM public.run_ra_contexto_evaluacion rrc
             JOIN public.run_ra rr ON rr.id = rrc.run_ra_id
             WHERE rrc.activity_id = a.id ORDER BY rr.created_at DESC LIMIT 1),
            NULLIF(trim(concat_ws(' ', u.name, u.last_name)), '')
          ) AS owner_name,
          u.email AS owner_email,
          ra.impact_code::text AS impact_code,
          ra.criticality_code::text AS criticality_code
        FROM public.activities a
        JOIN public.elements e ON e.id = a.element_id
        LEFT JOIN public.security_users u ON u.id = a.owner_id
        LEFT JOIN public.graph_map_run_sa_activities ra ON ra.activity_id = a.id AND ra.run_sa_id = ${runSaId}::uuid
        WHERE a.company_id = ${companyId}::uuid AND a.is_active = true
        ORDER BY a.name ASC
      `),
      prisma.$queryRaw<WizardPersonRow[]>(Prisma.sql`
        SELECT u.id::text, trim(concat_ws(' ', u.name, u.last_name)) AS full_name, u.email
        FROM public.security_users u
        WHERE u.company_id = ${companyId}::uuid AND coalesce(u.is_active, true) = true
        ORDER BY full_name ASC NULLS LAST, u.email ASC
      `),
      prisma.$queryRaw<WizardCatalogRow[]>(Prisma.sql`
        SELECT id_resource::text AS id, id_resource::text AS code, nombre AS name
        FROM public.company_resource_catalog ORDER BY nombre ASC
      `),
      prisma.$queryRaw<WizardCatalogRow[]>(Prisma.sql`
        SELECT id::text, code, name FROM public.graph_activities_failure_effect WHERE is_active = true ORDER BY sort_order ASC
      `),
      prisma.$queryRaw<WizardCatalogRow[]>(Prisma.sql`
        SELECT id::text, code, name FROM public.graph_activities_dependency_strength WHERE is_active = true ORDER BY sort_order ASC
      `),
      prisma.$queryRaw<WizardCatalogRow[]>(Prisma.sql`
        SELECT id::text, code, name FROM public.graph_activities_alternative_level WHERE is_active = true ORDER BY sort_order ASC
      `),
      prisma.$queryRaw<WizardDependencyRow[]>(Prisma.sql`
        SELECT
          d.id::text, d.activity_id::text, a.name AS activity_name,
          d.dependency_activity_id::text, da.name AS dependency_activity_name,
          d.dependency_resource_id::text, r.nombre AS dependency_resource_name,
          d.failure_effect_id::text, fe.name AS failure_effect_name,
          d.dependency_strength_id::text, ds.name AS dependency_strength_name,
          d.alternative_level_id::text, al.name AS alternative_level_name,
          d.dependency_person_id::text, trim(concat_ws(' ', up.name, up.last_name)) AS dependency_person_name,
          d.is_active
        FROM public.graph_activities_dependencies d
        JOIN public.activities a ON a.id = d.activity_id
        LEFT JOIN public.activities da ON da.id = d.dependency_activity_id
        LEFT JOIN public.security_users up ON up.id = d.dependency_person_id
        JOIN public.company_resource_catalog r ON r.id_resource = d.dependency_resource_id
        JOIN public.graph_activities_failure_effect fe ON fe.id = d.failure_effect_id
        JOIN public.graph_activities_dependency_strength ds ON ds.id = d.dependency_strength_id
        JOIN public.graph_activities_alternative_level al ON al.id = d.alternative_level_id
        WHERE d.company_id = ${companyId}::uuid AND d.is_active = true
        ORDER BY d.updated_at DESC LIMIT 300
      `),
      prisma.$queryRaw<WizardSharedResourceRow[]>(Prisma.sql`
        SELECT
          m.activity_id::text, a.name AS activity_name,
          r.resource_id::text, r.name AS resource_name, r.resource_type AS resource_type_code,
          tr.nombre AS resource_type_name, r.owner_id::text,
          trim(concat_ws(' ', u.name, u.last_name)) AS owner_name,
          m.failure_effect AS failure_effect_code, fe.name AS failure_effect_name,
          m.dependency_strength AS dependency_strength_code, ds.name AS dependency_strength_name,
          m.substitutability AS alternative_level_code, al.name AS alternative_level_name,
          r.criticality AS criticality_code, cr.label AS criticality_label,
          to_char(m.created_at, 'YYYY-MM-DD HH24:MI') AS created_at
        FROM public.graph_map_activity_resource_dependency m
        JOIN public.activities a ON a.id = m.activity_id
        JOIN public.graph_activity_resource r ON r.resource_id = m.resource_id
        LEFT JOIN public.security_users u ON u.id = r.owner_id
        LEFT JOIN public.company_resource_catalog tr ON tr.id_resource::text = r.resource_type
        LEFT JOIN public.graph_activities_failure_effect fe ON fe.code = m.failure_effect
        LEFT JOIN public.graph_activities_dependency_strength ds ON ds.code = m.dependency_strength
        LEFT JOIN public.graph_activities_alternative_level al ON al.code = m.substitutability
        LEFT JOIN public.graph_activity_catalog_criticality cr ON cr.code = r.criticality
        WHERE a.company_id = ${companyId}::uuid
        ORDER BY m.created_at DESC LIMIT 500
      `),
      prisma.$queryRaw<WizardLinearRiskRow[]>(Prisma.sql`
        SELECT
          rr.activity_id::text AS activity_id, rr.run_ra_id::text AS run_ra_id, r.code AS run_ra_code,
          rr.id::text AS risk_id, rr.name AS risk_name, rr.description AS risk_description, rr.consequence,
          ra.impact_score::float8 AS impact_score, ra.probability_score::float8 AS probability_score,
          ra.inherent_risk_score::float8 AS inherent_risk_score,
          to_char(r.created_at, 'YYYY-MM-DD HH24:MI') AS created_at
        FROM public.run_ra_risks rr
        JOIN public.run_ra r ON r.id = rr.run_ra_id
        LEFT JOIN public.run_ra_risk_analysis ra ON ra.run_ra_risk_id = rr.id
        WHERE r.company_id = ${companyId}::uuid AND rr.activity_id IS NOT NULL
        ORDER BY rr.activity_id, r.created_at DESC, ra.updated_at DESC, rr.created_at DESC
      `),
      prisma.$queryRaw<WizardCatalogRow[]>(Prisma.sql`
        SELECT code, label, operational_definition, decision_signal
        FROM public.graph_risk_catalog_cascade ORDER BY label ASC
      `),
      prisma.$queryRaw<WizardCatalogRow[]>(Prisma.sql`
        SELECT id_resource::text AS id, nombre AS name FROM public.company_resource_catalog ORDER BY nombre ASC
      `),
      prisma.$queryRaw<WizardRiskCascadeRow[]>(Prisma.sql`
        SELECT
          rc.risk_cascade_id::text, rc.run_sa_id::text, rc.risk_id::text, rr.name AS risk_name,
          rc.cascade_code, cc.label AS cascade_label, rc.affected_resource_id::text,
          cr.nombre AS resource_name, rc.notes, to_char(rc.created_at, 'YYYY-MM-DD HH24:MI') AS created_at
        FROM public.graph_risk_cascade rc
        JOIN public.run_ra_risks rr ON rr.id = rc.risk_id
        LEFT JOIN public.graph_risk_catalog_cascade cc ON cc.code = rc.cascade_code
        LEFT JOIN public.company_resource_catalog cr ON cr.id_resource = rc.affected_resource_id
        WHERE rc.run_sa_id = ${runSaId}::uuid
        ORDER BY rc.created_at DESC
      `),
      prisma.$queryRaw<WizardCatalogRow[]>(Prisma.sql`
        SELECT code, label, operational_definition::text, time_to_impact_reference::text, effect_profile::text
        FROM public.graph_activity_catalog_impact ORDER BY code ASC
      `),
      prisma.$queryRaw<WizardCatalogRow[]>(Prisma.sql`
        SELECT code, label, operational_definition::text, decision_signal::text
        FROM public.graph_activity_catalog_criticality ORDER BY code ASC
      `),
      prisma.$queryRaw<WizardLinearControlRow[]>(Prisma.sql`
        SELECT
          c.id_risk::text AS risk_id, c.id::text AS control_id, c.code AS control_code, c.name AS control_name,
          ct.name AS control_type_name, NULLIF(trim(concat_ws(' ', u.name, u.last_name)), '') AS owner_name,
          (c.cobertura::float8 / 100.0) AS mitigation_strength, true AS reduces_probability, true AS reduces_impact
        FROM public.run_ra_controls c
        JOIN public.run_ra_risks rr ON rr.id = c.id_risk
        JOIN public.run_ra r ON r.id = rr.run_ra_id
        LEFT JOIN public.catalog_control_type ct ON ct.id = c.control_type
        LEFT JOIN public.security_users u ON u.id = c.owner_id
        WHERE r.company_id = ${companyId}::uuid
      `),
    ]);

    return {
      activities, people, resources, effects, strengths, alternatives,
      dependencies, sharedResources, linearRiskContext, cascadeCatalog,
      resourceCatalog, riskCascades, impacts, criticalities, linearControlContext,
    };
  }

  async updateActivitySelection(runSaId: string, companyId: string, userId: string, selectedActivityIds: string[]): Promise<void> {
    companyId = await resolveEffectiveCompanyId(companyId);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.graph_map_run_sa_activities
        SET is_active = false, updated_at = now()
        WHERE run_sa_id = ${runSaId}::uuid AND company_id = ${companyId}::uuid
      `);
      for (const activityId of selectedActivityIds) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO public.graph_map_run_sa_activities (
            id, company_id, run_sa_id, activity_id, selected_by, selected_at, is_active, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), ${companyId}::uuid, ${runSaId}::uuid, ${activityId}::uuid,
            ${userId}::uuid, now(), true, now(), now()
          )
          ON CONFLICT (run_sa_id, activity_id) DO UPDATE SET
            selected_by = EXCLUDED.selected_by, selected_at = EXCLUDED.selected_at,
            is_active = true, updated_at = now()
        `);
      }
    });
  }

  async updateActivityImpactCriticality(runSaId: string, activityId: string, companyId: string, impactCode?: string | null, criticalityCode?: string | null): Promise<void> {
    companyId = await resolveEffectiveCompanyId(companyId);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE public.graph_map_run_sa_activities
      SET
        impact_code = COALESCE(${impactCode ?? null}, impact_code),
        criticality_code = COALESCE(${criticalityCode ?? null}, criticality_code),
        updated_at = now()
      WHERE run_sa_id = ${runSaId}::uuid AND activity_id = ${activityId}::uuid AND company_id = ${companyId}::uuid
    `);
  }

  async deleteDependency(dependencyId: string, companyId: string): Promise<void> {
    companyId = await resolveEffectiveCompanyId(companyId);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE public.graph_activities_dependencies
      SET is_active = false, updated_at = now()
      WHERE id = ${dependencyId}::uuid AND company_id = ${companyId}::uuid
    `);
  }

  async deleteSharedResource(activityId: string, resourceId: string): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM public.graph_map_activity_resource_dependency
      WHERE activity_id = ${activityId}::uuid AND resource_id = ${resourceId}::uuid
    `);
  }

  async deleteRiskCascade(riskCascadeId: string, runSaId: string): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM public.graph_risk_cascade
      WHERE risk_cascade_id = ${riskCascadeId}::uuid AND run_sa_id = ${runSaId}::uuid
    `);
  }

  async verifyActivityInRun(runSaId: string, companyId: string, activityId: string): Promise<boolean> {
    companyId = await resolveEffectiveCompanyId(companyId);
    const rows = await prisma.$queryRaw<Array<{ activity_id: string }>>(Prisma.sql`
      SELECT activity_id::text
      FROM public.graph_map_run_sa_activities
      WHERE run_sa_id = ${runSaId}::uuid AND company_id = ${companyId}::uuid
        AND activity_id = ${activityId}::uuid AND is_active = true
      LIMIT 1
    `);
    return Boolean(rows[0]);
  }

  async verifyActivityExists(activityId: string, companyId: string): Promise<boolean> {
    companyId = await resolveEffectiveCompanyId(companyId);
    const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id::text FROM public.activities
      WHERE id = ${activityId}::uuid AND company_id = ${companyId}::uuid AND is_active = true
      LIMIT 1
    `);
    return Boolean(rows[0]);
  }

  async validateCatalogCodes(input: {
    failureEffectId?: string;
    dependencyStrengthId?: string;
    alternativeLevelId?: string;
    resourceTypeId?: string;
    criticalityCode?: string;
    riskId?: string;
    cascadeCode?: string;
    affectedResourceId?: string | null;
    activityId?: string;
    runSaId?: string;
    companyId?: string;
  }) {
    const effectiveCompanyId = input.companyId ? await resolveEffectiveCompanyId(input.companyId) : undefined;
    const result: { failureEffectCode?: string; dependencyStrengthCode?: string; alternativeCode?: string; resourceTypeCode?: string; valid: boolean; error?: string } = { valid: true };

    if (input.failureEffectId) {
      const rows = await prisma.$queryRaw<Array<{ code: string }>>(Prisma.sql`SELECT code FROM public.graph_activities_failure_effect WHERE id = ${input.failureEffectId}::uuid LIMIT 1`);
      if (!rows[0]) { result.valid = false; result.error = 'Efecto de falla inválido'; return result; }
      result.failureEffectCode = rows[0].code;
    }
    if (input.dependencyStrengthId) {
      const rows = await prisma.$queryRaw<Array<{ code: string }>>(Prisma.sql`SELECT code FROM public.graph_activities_dependency_strength WHERE id = ${input.dependencyStrengthId}::uuid LIMIT 1`);
      if (!rows[0]) { result.valid = false; result.error = 'Fuerza de dependencia inválida'; return result; }
      result.dependencyStrengthCode = rows[0].code;
    }
    if (input.alternativeLevelId) {
      const rows = await prisma.$queryRaw<Array<{ code: string }>>(Prisma.sql`SELECT code FROM public.graph_activities_alternative_level WHERE id = ${input.alternativeLevelId}::uuid LIMIT 1`);
      if (!rows[0]) { result.valid = false; result.error = 'Nivel de alternativa inválido'; return result; }
      result.alternativeCode = rows[0].code;
    }
    if (input.resourceTypeId) {
      const rows = await prisma.$queryRaw<Array<{ code: string }>>(Prisma.sql`SELECT id_resource::text AS code FROM public.company_resource_catalog WHERE id_resource = ${input.resourceTypeId}::uuid LIMIT 1`);
      if (!rows[0]) { result.valid = false; result.error = 'Tipo de recurso inválido'; return result; }
      result.resourceTypeCode = rows[0].code;
    }
    if (input.criticalityCode) {
      const rows = await prisma.$queryRaw<Array<{ code: string }>>(Prisma.sql`SELECT code FROM public.graph_activity_catalog_criticality WHERE code = ${input.criticalityCode} LIMIT 1`);
      if (!rows[0]) { result.valid = false; result.error = 'Nivel de criticidad inválido'; return result; }
    }
    if (input.riskId && effectiveCompanyId) {
      const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT rr.id::text FROM public.run_ra_risks rr
        JOIN public.run_ra r ON r.id = rr.run_ra_id
        WHERE rr.id = ${input.riskId}::uuid AND r.company_id = ${effectiveCompanyId}::uuid LIMIT 1
      `);
      if (!rows[0]) { result.valid = false; result.error = 'Riesgo inválido'; return result; }
    }
    if (input.cascadeCode) {
      const rows = await prisma.$queryRaw<Array<{ code: string }>>(Prisma.sql`SELECT code FROM public.graph_risk_catalog_cascade WHERE code = ${input.cascadeCode} LIMIT 1`);
      if (!rows[0]) { result.valid = false; result.error = 'Tipo de cascada inválido'; return result; }
    }
    if (input.affectedResourceId) {
      const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id_resource::text AS id FROM public.company_resource_catalog WHERE id_resource = ${input.affectedResourceId}::uuid LIMIT 1`);
      if (!rows[0]) { result.valid = false; result.error = 'Recurso afectado inválido'; return result; }
    }
    return result;
  }

  async upsertDependency(input: UpsertDependencyInput): Promise<{ id: string; created: boolean }> {
    const effectiveCompanyId = await resolveEffectiveCompanyId(input.companyId);
    if (input.dependencyId) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE public.graph_activities_dependencies SET
          activity_id = ${input.activityId}::uuid,
          dependency_activity_id = ${input.dependencyActivityId}::uuid,
          dependency_resource_id = ${input.dependencyResourceId}::uuid,
          failure_effect_id = ${input.failureEffectId}::uuid,
          dependency_strength_id = ${input.dependencyStrengthId}::uuid,
          alternative_level_id = ${input.alternativeLevelId}::uuid,
          dependency_person_id = ${input.dependencyPersonId}::uuid,
          updated_at = now()
        WHERE id = ${input.dependencyId}::uuid AND company_id = ${effectiveCompanyId}::uuid
      `);
      return { id: input.dependencyId, created: false };
    }

    const existing = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id::text FROM public.graph_activities_dependencies
      WHERE company_id = ${effectiveCompanyId}::uuid AND activity_id = ${input.activityId}::uuid
        AND (
          (${input.dependencyActivityId}::uuid IS NULL AND dependency_activity_id IS NULL)
          OR dependency_activity_id = ${input.dependencyActivityId}::uuid
        )
        AND dependency_resource_id = ${input.dependencyResourceId}::uuid
        AND failure_effect_id = ${input.failureEffectId}::uuid
        AND dependency_strength_id = ${input.dependencyStrengthId}::uuid
        AND alternative_level_id = ${input.alternativeLevelId}::uuid
      LIMIT 1
    `);

    if (existing[0]?.id) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE public.graph_activities_dependencies SET is_active = true, updated_at = now() WHERE id = ${existing[0].id}::uuid
      `);
      return { id: existing[0].id, created: false };
    }

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO public.graph_activities_dependencies (
        id, company_id, activity_id, dependency_resource_id, dependency_activity_id,
        dependency_system_name, dependency_data_name, dependency_person_id,
        dependency_provider_name, dependency_document_name,
        failure_effect_id, dependency_strength_id, alternative_level_id,
        control_id, description, is_active, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), ${effectiveCompanyId}::uuid, ${input.activityId}::uuid, ${input.dependencyResourceId}::uuid, ${input.dependencyActivityId}::uuid,
        ${input.dependencySystemName ?? null}, ${input.dependencyDataName ?? null}, ${input.dependencyPersonId}::uuid,
        ${input.dependencyProviderName ?? null}, ${input.dependencyDocumentName ?? null},
        ${input.failureEffectId}::uuid, ${input.dependencyStrengthId}::uuid, ${input.alternativeLevelId}::uuid,
        NULL, NULL, true, now(), now()
      )
    `);
    return { id: '', created: true };
  }

  async upsertSharedResource(input: UpsertSharedResourceInput): Promise<{ resourceId: string }> {
    const finalResourceId = input.resourceId ?? crypto.randomUUID();
    await prisma.$transaction(async (tx) => {
      if (input.resourceId) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.graph_activity_resource SET
            name = ${input.resourceName}, resource_type = ${input.resourceTypeCode},
            owner_id = ${input.ownerId}::uuid, substitutability = ${input.alternativeCode},
            criticality = ${input.criticalityCode}, updated_at = now()
          WHERE resource_id = ${input.resourceId}::uuid
        `);
        await tx.$executeRaw(Prisma.sql`
          DELETE FROM public.graph_map_activity_resource_dependency WHERE resource_id = ${input.resourceId}::uuid
        `);
      } else {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO public.graph_activity_resource (
            resource_id, name, resource_type, owner_id, substitutability, criticality, created_at, updated_at
          ) VALUES (
            ${finalResourceId}::uuid, ${input.resourceName}, ${input.resourceTypeCode},
            ${input.ownerId}::uuid, ${input.alternativeCode}, ${input.criticalityCode}, now(), now()
          )
        `);
      }
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO public.graph_map_activity_resource_dependency (
          activity_id, resource_id, dependency_strength, substitutability, failure_effect, created_at
        ) VALUES (
          ${input.activityId}::uuid, ${finalResourceId}::uuid,
          ${input.dependencyStrengthCode}, ${input.alternativeCode}, ${input.failureEffectCode}, now()
        )
      `);
    });
    return { resourceId: finalResourceId };
  }

  async upsertRiskCascade(input: UpsertRiskCascadeInput): Promise<{ riskCascadeId: string; created: boolean }> {
    if (input.riskCascadeId) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE public.graph_risk_cascade SET
          risk_id = ${input.riskId}::uuid, cascade_code = ${input.cascadeCode},
          affected_resource_id = ${input.affectedResourceId}::uuid, notes = ${input.notes ?? null}, updated_at = now()
        WHERE risk_cascade_id = ${input.riskCascadeId}::uuid AND run_sa_id = ${input.runSaId}::uuid
      `);
      return { riskCascadeId: input.riskCascadeId, created: false };
    }

    const rows = await prisma.$queryRaw<Array<{ risk_cascade_id: string }>>(Prisma.sql`
      INSERT INTO public.graph_risk_cascade (
        risk_cascade_id, run_sa_id, risk_id, cascade_code, affected_resource_id, notes, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), ${input.runSaId}::uuid, ${input.riskId}::uuid, ${input.cascadeCode},
        ${input.affectedResourceId}::uuid, ${input.notes ?? null}, now(), now()
      )
      RETURNING risk_cascade_id::text
    `);
    return { riskCascadeId: rows[0]?.risk_cascade_id ?? '', created: true };
  }
}

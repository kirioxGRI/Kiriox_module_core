import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';
import type {
  ElenaEngine, ElenaRunInput, ElenaRunResult, ElenaRunSummary,
  ElenaMetricRow, ElenaCascadeRow,
} from '@/modules/structural-map/domain/types/ElenaTypes';
import {
  buildScopedCriticalityMetricRows,
  buildScopedExposureMetricRows,
  buildScopedGraphContext,
  buildScopedResilienceMetricRows,
  buildScopedStructuralMetricRows,
  STRUCTURAL_RELATION_CODES,
  type ScopeEntityRow,
  type ScopeRelationRow,
  type ScopedGraphContext,
} from '@/modules/structural-map/infrastructure/elena/scopedAnalysis';

const FN_MAP: Record<string, string> = {
  structural:  'fn_elena_systemic_structural_analysis',
  criticality: 'fn_elena_systemic_criticality_analysis',
  resilience:  'fn_elena_systemic_resilience_analysis',
  exposure:    'fn_elena_systemic_exposure_analysis',
  cascade:     'fn_elena_systemic_cascade_simulation',
};

type RunInfo = { run_id: string; name: string; analysis_type: string; status: string; completed_at: string | null; started_at: string | null };

export class PrismaElenaRepository {
  async runAndFetch(input: ElenaRunInput): Promise<ElenaRunResult> {
    const { rootEntityId, engine, scenario, userId, scopeEntityIds } = input;
    const fn = FN_MAP[engine];
    if (!fn) throw new Error(`Motor desconocido: ${engine}`);

    try {
      if (engine === 'structural' && scopeEntityIds?.length) {
        return await this.runScopedStructuralAnalysis(rootEntityId, scopeEntityIds, userId, fn);
      }
      if (engine === 'criticality' && scopeEntityIds?.length) {
        return await this.runScopedCriticalityAnalysis(rootEntityId, scopeEntityIds, userId, fn);
      }
      if (engine === 'resilience' && scopeEntityIds?.length) {
        return await this.runScopedResilienceAnalysis(rootEntityId, scopeEntityIds, userId, fn);
      }
      if (engine === 'exposure' && scopeEntityIds?.length) {
        return await this.runScopedExposureAnalysis(rootEntityId, scopeEntityIds, userId, fn);
      }
      if (engine === 'cascade') {
        return await this.runCascade(rootEntityId, scenario ?? 'FAILURE', userId, fn);
      }
      return await this.runAnalysis(rootEntityId, engine as Exclude<ElenaEngine, 'cascade'>, userId, fn);
    } catch (e) {
      return {
        ok: false, engine, functionName: fn,
        runId: '', executedAt: new Date().toISOString(),
        summary: { analysisType: engine, totalEntities: 0 },
        rows: [],
        error: e instanceof Error ? e.message : 'Error inesperado ejecutando el motor',
      };
    }
  }

  /** Normaliza el scope visible, valida la raíz y construye el grafo en memoria. Compartido por todos los runners scoped. */
  private async prepareScopedGraph(rootEntityId: string, scopeEntityIds: string[]) {
    const normalizedScope = Array.from(new Set(scopeEntityIds.filter(Boolean)));
    if (!normalizedScope.includes(rootEntityId)) {
      normalizedScope.unshift(rootEntityId);
    }

    const entities = await this.fetchScopeEntities(normalizedScope);
    const rootScopeEntity = entities.find((entity) => entity.id === rootEntityId);
    if (!rootScopeEntity) {
      throw new Error('La entidad raíz visible no existe o no está activa dentro del scope del canvas');
    }

    const relations = await this.fetchScopeRelations(normalizedScope);
    const graph = buildScopedGraphContext(rootEntityId, entities, relations);
    return { normalizedScope, graph, rootScopeEntity };
  }

  /** Crea el run en estado 'running' con un analysis_type válido del constraint. Compartido por todos los runners scoped. */
  private async createScopedRun(params: {
    analysisType: string;
    label: string;
    rootScopeEntity: ScopeEntityRow;
    rootEntityId: string;
    scopeSize: number;
    userId: string | undefined;
  }): Promise<string> {
    const { analysisType, label, rootScopeEntity, rootEntityId, scopeSize, userId } = params;
    const runName = `${label} - ${rootScopeEntity.code.trim() || rootEntityId}`;
    const runDescription = `Visible canvas ${label.toLowerCase()} rooted at ${rootScopeEntity.name?.trim() || 'unknown entity'} (${rootEntityId}). Scope entities: ${scopeSize}.`;

    const runRows = await prisma.$queryRaw<{ run_id: string }[]>(Prisma.sql`
      INSERT INTO systemic_structural_analysis_runs (
        name, description, analysis_type, status, started_at, created_by
      ) VALUES (
        ${runName}, ${runDescription}, ${analysisType}, 'running', now(),
        ${userId ? Prisma.sql`${userId}::uuid` : Prisma.sql`NULL::uuid`}
      )
      RETURNING id::text AS run_id
    `);
    const runId = String(runRows[0]?.run_id ?? '');
    if (!runId) throw new Error('No fue posible crear el run de análisis visible');
    return runId;
  }

  /** Marca el run como completado, relee métricas y arma el resultado. Compartido por todos los runners scoped. */
  private async finishScopedRun(params: {
    runId: string;
    engine: ElenaEngine;
    analysisType: string;
    rootEntityId: string;
    graph: ScopedGraphContext;
    fn: string;
  }): Promise<ElenaRunResult> {
    const { runId, engine, analysisType, rootEntityId, graph, fn } = params;
    await prisma.$executeRaw(Prisma.sql`
      UPDATE systemic_structural_analysis_runs
      SET status = 'completed', completed_at = now()
      WHERE id = ${runId}::uuid
    `);

    const rows = await this.fetchMetricRows(runId, engine);
    const rootEntity = graph.entityMap.get(rootEntityId)?.name ?? await this.getEntityName(rootEntityId);
    const summary = this.buildAnalysisSummary(engine, rows, rootEntity, analysisType);

    return {
      ok: true,
      engine,
      functionName: `${fn} [visible-scope]`,
      runId,
      executedAt: new Date().toISOString(),
      summary,
      rows,
    };
  }

  private async runScopedStructuralAnalysis(
    rootEntityId: string,
    scopeEntityIds: string[],
    userId: string | undefined,
    fn: string,
  ): Promise<ElenaRunResult> {
    const { normalizedScope, graph, rootScopeEntity } = await this.prepareScopedGraph(rootEntityId, scopeEntityIds);
    const runId = await this.createScopedRun({
      analysisType: 'full_structural_analysis',
      label: 'Structural analysis',
      rootScopeEntity, rootEntityId, scopeSize: normalizedScope.length, userId,
    });

    const metricRows = buildScopedStructuralMetricRows(rootEntityId, graph);

    for (const metric of metricRows) {
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO systemic_structural_metrics (
          structural_analysis_run_id,
          entity_id,
          metric_type,
          metric_value,
          metric_level,
          metric_details
        )
        VALUES (
          ${runId}::uuid,
          ${metric.entityId}::uuid,
          ${metric.metricType},
          ${metric.metricValue},
          ${metric.metricLevel},
          ${JSON.stringify(metric.metricDetails)}::jsonb
        )
        ON CONFLICT (structural_analysis_run_id, entity_id, metric_type) DO UPDATE
        SET
          metric_value = EXCLUDED.metric_value,
          metric_level = EXCLUDED.metric_level,
          metric_details = EXCLUDED.metric_details
      `);
    }

    return this.finishScopedRun({
      runId, engine: 'structural', analysisType: 'full_structural_analysis', rootEntityId, graph, fn,
    });
  }

  private async runScopedCriticalityAnalysis(
    rootEntityId: string,
    scopeEntityIds: string[],
    userId: string | undefined,
    fn: string,
  ): Promise<ElenaRunResult> {
    const { normalizedScope, graph, rootScopeEntity } = await this.prepareScopedGraph(rootEntityId, scopeEntityIds);
    const runId = await this.createScopedRun({
      analysisType: 'critical_nodes_analysis',
      label: 'Criticality analysis',
      rootScopeEntity, rootEntityId, scopeSize: normalizedScope.length, userId,
    });

    const metricRows = buildScopedCriticalityMetricRows(rootEntityId, graph);

    for (const metric of metricRows) {
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO systemic_structural_metrics (
          structural_analysis_run_id,
          entity_id,
          metric_type,
          metric_value,
          metric_level,
          metric_details,
          incoming_count,
          outgoing_count,
          total_degree,
          dependency_count,
          dependent_count,
          control_count,
          risk_count,
          obligation_count,
          evidence_count,
          cascade_exposure_score,
          criticality_score,
          criticality_level,
          is_critical_node
        ) VALUES (
          ${runId}::uuid,
          ${metric.entityId}::uuid,
          ${metric.metricType},
          ${metric.metricValue},
          ${metric.metricLevel},
          ${JSON.stringify(metric.metricDetails)}::jsonb,
          ${metric.incomingCount},
          ${metric.outgoingCount},
          ${metric.totalDegree},
          ${metric.dependencyCount},
          ${metric.dependentCount},
          ${metric.controlCount},
          ${metric.riskCount},
          ${metric.obligationCount},
          ${metric.evidenceCount},
          ${metric.cascadeExposureScore},
          ${metric.criticalityScore},
          ${metric.criticalityLevel},
          ${metric.isCriticalNode}
        )
        ON CONFLICT (structural_analysis_run_id, entity_id, metric_type) DO UPDATE
        SET
          metric_value = EXCLUDED.metric_value,
          metric_level = EXCLUDED.metric_level,
          metric_details = EXCLUDED.metric_details,
          incoming_count = EXCLUDED.incoming_count,
          outgoing_count = EXCLUDED.outgoing_count,
          total_degree = EXCLUDED.total_degree,
          dependency_count = EXCLUDED.dependency_count,
          dependent_count = EXCLUDED.dependent_count,
          control_count = EXCLUDED.control_count,
          risk_count = EXCLUDED.risk_count,
          obligation_count = EXCLUDED.obligation_count,
          evidence_count = EXCLUDED.evidence_count,
          cascade_exposure_score = EXCLUDED.cascade_exposure_score,
          criticality_score = EXCLUDED.criticality_score,
          criticality_level = EXCLUDED.criticality_level,
          is_critical_node = EXCLUDED.is_critical_node
      `);
    }

    return this.finishScopedRun({
      runId, engine: 'criticality', analysisType: 'critical_nodes_analysis', rootEntityId, graph, fn,
    });
  }

  private async runScopedResilienceAnalysis(
    rootEntityId: string,
    scopeEntityIds: string[],
    userId: string | undefined,
    fn: string,
  ): Promise<ElenaRunResult> {
    const { normalizedScope, graph, rootScopeEntity } = await this.prepareScopedGraph(rootEntityId, scopeEntityIds);
    const runId = await this.createScopedRun({
      analysisType: 'resilience_analysis',
      label: 'Resilience analysis',
      rootScopeEntity, rootEntityId, scopeSize: normalizedScope.length, userId,
    });

    const metricRows = buildScopedResilienceMetricRows(rootEntityId, graph);

    for (const metric of metricRows) {
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO systemic_structural_metrics (
          structural_analysis_run_id,
          entity_id,
          metric_type,
          metric_value,
          metric_level,
          metric_details,
          dependency_count,
          dependent_count,
          support_count,
          alternative_support_count,
          control_count,
          risk_count,
          is_spof,
          resilience_score,
          resilience_level,
          fragility_score,
          has_resilience_gap
        ) VALUES (
          ${runId}::uuid,
          ${metric.entityId}::uuid,
          ${metric.metricType},
          ${metric.metricValue},
          ${metric.metricLevel},
          ${JSON.stringify(metric.metricDetails)}::jsonb,
          ${metric.dependencyCount},
          ${metric.dependentCount},
          ${metric.supportCount},
          ${metric.alternativeSupportCount},
          ${metric.controlCount},
          ${metric.riskCount},
          ${metric.isSpof},
          ${metric.resilienceScore},
          ${metric.resilienceLevel},
          ${metric.fragilityScore},
          ${metric.hasResilienceGap}
        )
        ON CONFLICT (structural_analysis_run_id, entity_id, metric_type) DO UPDATE
        SET
          metric_value = EXCLUDED.metric_value,
          metric_level = EXCLUDED.metric_level,
          metric_details = EXCLUDED.metric_details,
          dependency_count = EXCLUDED.dependency_count,
          dependent_count = EXCLUDED.dependent_count,
          support_count = EXCLUDED.support_count,
          alternative_support_count = EXCLUDED.alternative_support_count,
          control_count = EXCLUDED.control_count,
          risk_count = EXCLUDED.risk_count,
          is_spof = EXCLUDED.is_spof,
          resilience_score = EXCLUDED.resilience_score,
          resilience_level = EXCLUDED.resilience_level,
          fragility_score = EXCLUDED.fragility_score,
          has_resilience_gap = EXCLUDED.has_resilience_gap
      `);
    }

    return this.finishScopedRun({
      runId, engine: 'resilience', analysisType: 'resilience_analysis', rootEntityId, graph, fn,
    });
  }

  private async runScopedExposureAnalysis(
    rootEntityId: string,
    scopeEntityIds: string[],
    userId: string | undefined,
    fn: string,
  ): Promise<ElenaRunResult> {
    const { normalizedScope, graph, rootScopeEntity } = await this.prepareScopedGraph(rootEntityId, scopeEntityIds);
    const runId = await this.createScopedRun({
      analysisType: 'structural_exposure_analysis',
      label: 'Exposure analysis',
      rootScopeEntity, rootEntityId, scopeSize: normalizedScope.length, userId,
    });

    const metricRows = buildScopedExposureMetricRows(rootEntityId, graph);

    for (const metric of metricRows) {
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO systemic_structural_metrics (
          structural_analysis_run_id,
          entity_id,
          metric_type,
          metric_value,
          metric_level,
          metric_details,
          incoming_count,
          outgoing_count,
          total_degree,
          dependency_count,
          dependent_count,
          risk_count,
          control_count,
          obligation_count,
          data_count,
          incident_count,
          uncontrolled_risk_count,
          exposure_score,
          exposure_level,
          has_exposure_gap
        ) VALUES (
          ${runId}::uuid,
          ${metric.entityId}::uuid,
          ${metric.metricType},
          ${metric.metricValue},
          ${metric.metricLevel},
          ${JSON.stringify(metric.metricDetails)}::jsonb,
          ${metric.incomingCount},
          ${metric.outgoingCount},
          ${metric.totalDegree},
          ${metric.dependencyCount},
          ${metric.dependentCount},
          ${metric.riskCount},
          ${metric.controlCount},
          ${metric.obligationCount},
          ${metric.dataCount},
          ${metric.incidentCount},
          ${metric.uncontrolledRiskCount},
          ${metric.exposureScore},
          ${metric.exposureLevel},
          ${metric.hasExposureGap}
        )
        ON CONFLICT (structural_analysis_run_id, entity_id, metric_type) DO UPDATE
        SET
          metric_value = EXCLUDED.metric_value,
          metric_level = EXCLUDED.metric_level,
          metric_details = EXCLUDED.metric_details,
          incoming_count = EXCLUDED.incoming_count,
          outgoing_count = EXCLUDED.outgoing_count,
          total_degree = EXCLUDED.total_degree,
          dependency_count = EXCLUDED.dependency_count,
          dependent_count = EXCLUDED.dependent_count,
          risk_count = EXCLUDED.risk_count,
          control_count = EXCLUDED.control_count,
          obligation_count = EXCLUDED.obligation_count,
          data_count = EXCLUDED.data_count,
          incident_count = EXCLUDED.incident_count,
          uncontrolled_risk_count = EXCLUDED.uncontrolled_risk_count,
          exposure_score = EXCLUDED.exposure_score,
          exposure_level = EXCLUDED.exposure_level,
          has_exposure_gap = EXCLUDED.has_exposure_gap
      `);
    }

    return this.finishScopedRun({
      runId, engine: 'exposure', analysisType: 'structural_exposure_analysis', rootEntityId, graph, fn,
    });
  }

  private async runAnalysis(
    rootEntityId: string,
    engine: Exclude<ElenaEngine, 'cascade'>,
    userId: string | undefined,
    fn: string,
  ): Promise<ElenaRunResult> {
    const runRows = await prisma.$queryRaw<{ run_id: string }[]>(Prisma.sql`
      SELECT ${Prisma.raw(fn)}(
        ${rootEntityId}::uuid,
        ${userId ?? null}::uuid
      )::text AS run_id
    `);
    const runId = String(runRows[0]?.run_id ?? '');
    if (!runId) throw new Error('La función no devolvió un run_id válido');

    const [run] = await prisma.$queryRaw<RunInfo[]>(Prisma.sql`
      SELECT id::text AS run_id, name, analysis_type, status,
             started_at::text, completed_at::text
      FROM systemic_structural_analysis_runs
      WHERE id = ${runId}::uuid
    `);

    const rootEntity = await this.getEntityName(rootEntityId);
    const rows       = await this.fetchMetricRows(runId, engine);
    const summary    = this.buildAnalysisSummary(engine, rows, rootEntity, run?.analysis_type ?? engine);

    return {
      ok: true, engine, functionName: fn, runId,
      executedAt: run?.completed_at ?? new Date().toISOString(),
      summary, rows,
    };
  }

  private async runCascade(
    rootEntityId: string,
    scenario: string,
    userId: string | undefined,
    fn: string,
  ): Promise<ElenaRunResult> {
    const runRows = await prisma.$queryRaw<{ run_id: string }[]>(Prisma.sql`
      SELECT ${Prisma.raw(fn)}(
        ${rootEntityId}::uuid,
        ${scenario},
        ${userId ?? null}::uuid
      )::text AS run_id
    `);
    const runId = String(runRows[0]?.run_id ?? '');
    if (!runId) throw new Error('La simulación no devolvió un run_id válido');

    const rootEntity = await this.getEntityName(rootEntityId);
    const rows       = await this.fetchCascadeRows(runId);

    const directAffected   = (rows as ElenaCascadeRow[]).filter((r) => r.impact_depth === 1 && !r.is_origin).length;
    const indirectAffected = (rows as ElenaCascadeRow[]).filter((r) => r.impact_depth > 1).length;
    const maxDepth         = Math.max(0, ...(rows as ElenaCascadeRow[]).map((r) => r.impact_depth));
    const avgScore         = rows.length ? (rows as ElenaCascadeRow[]).reduce((a, r) => a + r.impact_score, 0) / rows.length : 0;

    const summary: ElenaRunSummary = {
      analysisType: 'cascade_simulation',
      rootEntityName: rootEntity,
      totalEntities: rows.length,
      affectedCount: rows.filter((r) => !(r as ElenaCascadeRow).is_origin).length,
      directAffected,
      indirectAffected,
      maxDepth,
      avgScore: parseFloat(avgScore.toFixed(2)),
      scenario,
    };

    return { ok: true, engine: 'cascade', functionName: fn, runId, executedAt: new Date().toISOString(), summary, rows };
  }

  private async fetchMetricRows(runId: string, engine: string): Promise<ElenaMetricRow[]> {
    const rows = await prisma.$queryRaw<ElenaMetricRow[]>(Prisma.sql`
      SELECT
        ssm.entity_id::text,
        se.name  AS entity_name,
        se.code  AS entity_code,
        et.name  AS entity_type_name,
        ssm.metric_type,
        ssm.metric_value::float     AS metric_value,
        ssm.metric_level,
        ssm.metric_details,
        ssm.total_degree::int       AS total_degree,
        ssm.incoming_count::int     AS incoming_count,
        ssm.outgoing_count::int     AS outgoing_count,
        ssm.dependency_count::int   AS dependency_count,
        ssm.dependent_count::int    AS dependent_count,
        ssm.is_spof,
        ssm.criticality_score::float      AS criticality_score,
        ssm.criticality_level,
        ssm.is_critical_node,
        ssm.risk_count::int               AS risk_count,
        ssm.control_count::int            AS control_count,
        ssm.cascade_exposure_score::float AS cascade_exposure_score,
        ssm.resilience_score::float       AS resilience_score,
        ssm.resilience_level,
        ssm.fragility_score::float        AS fragility_score,
        ssm.has_resilience_gap,
        ssm.support_count::int            AS support_count,
        ssm.alternative_support_count::int AS alternative_support_count,
        ssm.exposure_score::float         AS exposure_score,
        ssm.exposure_level,
        ssm.has_exposure_gap,
        ssm.uncontrolled_risk_count::int  AS uncontrolled_risk_count,
        ssm.obligation_count::int         AS obligation_count,
        ssm.data_count::int               AS data_count,
        ssm.incident_count::int           AS incident_count
      FROM systemic_structural_metrics ssm
      JOIN systemic_entities se ON se.id = ssm.entity_id
      JOIN systemic_entity_types et ON et.id = se.entity_type_id
      WHERE ssm.structural_analysis_run_id = ${runId}::uuid
      ORDER BY
        COALESCE(ssm.criticality_score, ssm.exposure_score, ssm.resilience_score, ssm.metric_value, 0)::float DESC NULLS LAST,
        se.name
    `);
    return rows.map((r) => ({
      ...r,
      entity_id:               String(r.entity_id),
      metric_value:            r.metric_value            != null ? Number(r.metric_value)            : null,
      metric_details:          r.metric_details && typeof r.metric_details === 'object' ? r.metric_details as Record<string, unknown> : null,
      total_degree:            r.total_degree            != null ? Number(r.total_degree)            : null,
      incoming_count:          r.incoming_count          != null ? Number(r.incoming_count)          : null,
      outgoing_count:          r.outgoing_count          != null ? Number(r.outgoing_count)          : null,
      dependency_count:        r.dependency_count        != null ? Number(r.dependency_count)        : null,
      dependent_count:         r.dependent_count         != null ? Number(r.dependent_count)         : null,
      is_spof:                 r.is_spof                 != null ? Boolean(r.is_spof)                : null,
      criticality_score:       r.criticality_score       != null ? Number(r.criticality_score)       : null,
      is_critical_node:        r.is_critical_node        != null ? Boolean(r.is_critical_node)       : null,
      risk_count:              r.risk_count              != null ? Number(r.risk_count)              : null,
      control_count:           r.control_count           != null ? Number(r.control_count)           : null,
      cascade_exposure_score:  r.cascade_exposure_score  != null ? Number(r.cascade_exposure_score)  : null,
      resilience_score:        r.resilience_score        != null ? Number(r.resilience_score)        : null,
      fragility_score:         r.fragility_score         != null ? Number(r.fragility_score)         : null,
      has_resilience_gap:      r.has_resilience_gap      != null ? Boolean(r.has_resilience_gap)     : null,
      support_count:           r.support_count           != null ? Number(r.support_count)           : null,
      alternative_support_count: r.alternative_support_count != null ? Number(r.alternative_support_count) : null,
      exposure_score:          r.exposure_score          != null ? Number(r.exposure_score)          : null,
      has_exposure_gap:        r.has_exposure_gap        != null ? Boolean(r.has_exposure_gap)       : null,
      uncontrolled_risk_count: r.uncontrolled_risk_count != null ? Number(r.uncontrolled_risk_count) : null,
      obligation_count:        r.obligation_count        != null ? Number(r.obligation_count)        : null,
      data_count:              r.data_count              != null ? Number(r.data_count)              : null,
      incident_count:          r.incident_count          != null ? Number(r.incident_count)          : null,
    }));
  }

  private async fetchScopeEntities(scopeEntityIds: string[]): Promise<ScopeEntityRow[]> {
    if (!scopeEntityIds.length) return [];
    const scopeIdsSql = Prisma.join(scopeEntityIds.map((id) => Prisma.sql`${id}::uuid`));
    const rows = await prisma.$queryRaw<ScopeEntityRow[]>(Prisma.sql`
      SELECT
        se.id::text AS id,
        se.name,
        se.code,
        se.criticality_level,
        et.name AS entity_type_name,
        et.code AS entity_type_code
      FROM systemic_entities se
      JOIN systemic_entity_types et ON et.id = se.entity_type_id
      WHERE se.is_active = true
        AND se.id IN (${scopeIdsSql})
    `);
    return rows.map((row) => ({
      ...row,
      id: String(row.id),
    }));
  }

  private async fetchScopeRelations(scopeEntityIds: string[]): Promise<ScopeRelationRow[]> {
    if (!scopeEntityIds.length) return [];
    const scopeIdsSql = Prisma.join(scopeEntityIds.map((id) => Prisma.sql`${id}::uuid`));
    const relationCodesSql = Prisma.join(Array.from(STRUCTURAL_RELATION_CODES).map((code) => Prisma.sql`${code}`));
    const rows = await prisma.$queryRaw<ScopeRelationRow[]>(Prisma.sql`
      SELECT
        r.source_entity_id::text AS source_entity_id,
        r.target_entity_id::text AS target_entity_id,
        rt.code AS relation_code
      FROM systemic_entity_relations r
      JOIN systemic_relation_types rt ON rt.id = r.relation_type_id
      WHERE r.is_active = true
        AND rt.is_active = true
        AND rt.code IN (${relationCodesSql})
        AND r.source_entity_id IN (${scopeIdsSql})
        AND r.target_entity_id IN (${scopeIdsSql})
    `);
    return rows.map((row) => ({
      ...row,
      source_entity_id: String(row.source_entity_id),
      target_entity_id: String(row.target_entity_id),
    }));
  }

  private async fetchCascadeRows(runId: string): Promise<ElenaCascadeRow[]> {
    const rows = await prisma.$queryRaw<ElenaCascadeRow[]>(Prisma.sql`
      SELECT
        si.entity_id::text,
        se.name  AS entity_name,
        se.code  AS entity_code,
        et.name  AS entity_type_name,
        si.impact_level,
        si.impact_score::float  AS impact_score,
        si.impact_depth::int    AS impact_depth,
        si.is_origin,
        si.impact_reason,
        si.recommended_action
      FROM systemic_simulation_impacts si
      JOIN systemic_entities se ON se.id = si.entity_id
      JOIN systemic_entity_types et ON et.id = se.entity_type_id
      WHERE si.simulation_run_id = ${runId}::uuid
      ORDER BY si.impact_depth ASC, si.impact_score DESC
    `);
    return rows.map((r) => ({
      ...r,
      entity_id:  String(r.entity_id),
      impact_score: Number(r.impact_score ?? 0),
      impact_depth: Number(r.impact_depth ?? 0),
      is_origin:    Boolean(r.is_origin),
    }));
  }

  private async getEntityName(entityId: string): Promise<string | undefined> {
    const rows = await prisma.$queryRaw<{ name: string }[]>(Prisma.sql`
      SELECT name FROM systemic_entities WHERE id = ${entityId}::uuid LIMIT 1
    `);
    return rows[0]?.name;
  }

  private buildAnalysisSummary(
    engine: string,
    rows: ElenaMetricRow[],
    rootEntity: string | undefined,
    analysisType: string,
  ): ElenaRunSummary {
    const uniqueEntities = new Set(rows.map((r) => r.entity_id)).size;

    if (engine === 'structural') {
      const spofRows = rows.filter((r) =>
        r.metric_type === 'spof' &&
        ((r.metric_value ?? 0) > 0 || (r.metric_details && r.metric_details['possible_spof'] === true)),
      );
      const scores = rows
        .filter((r) => r.metric_type === 'criticality')
        .map((r) => r.metric_value)
        .filter((v) => v != null) as number[];
      return {
        analysisType, rootEntityName: rootEntity, totalEntities: uniqueEntities,
        spofCount: new Set(spofRows.map((r) => r.entity_id)).size,
        avgScore: scores.length ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : 0,
        maxScore: scores.length ? parseFloat(Math.max(...scores).toFixed(2)) : 0,
      };
    }

    if (engine === 'criticality') {
      const critRows = rows.filter((r) => r.is_critical_node);
      const scores   = rows.map((r) => r.criticality_score).filter((v) => v != null) as number[];
      return {
        analysisType, rootEntityName: rootEntity, totalEntities: uniqueEntities,
        criticalNodeCount: critRows.length,
        avgScore: scores.length ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : 0,
        maxScore: scores.length ? parseFloat(Math.max(...scores).toFixed(2)) : 0,
      };
    }

    if (engine === 'resilience') {
      const spofRows = rows.filter((r) => r.is_spof);
      const gapRows  = rows.filter((r) => r.has_resilience_gap);
      const scores   = rows.map((r) => r.resilience_score).filter((v) => v != null) as number[];
      return {
        analysisType, rootEntityName: rootEntity, totalEntities: uniqueEntities,
        spofCount: spofRows.length, resilienceGaps: gapRows.length,
        avgScore: scores.length ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : 0,
      };
    }

    if (engine === 'exposure') {
      const gapRows      = rows.filter((r) => r.has_exposure_gap);
      const uncontrolled = rows.reduce((a, r) => a + (r.uncontrolled_risk_count ?? 0), 0);
      const scores       = rows.map((r) => r.exposure_score).filter((v) => v != null) as number[];
      return {
        analysisType, rootEntityName: rootEntity, totalEntities: uniqueEntities,
        exposureGaps: gapRows.length,
        avgScore: scores.length ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : 0,
        maxScore: uncontrolled,
      };
    }

    return { analysisType, rootEntityName: rootEntity, totalEntities: uniqueEntities };
  }
}

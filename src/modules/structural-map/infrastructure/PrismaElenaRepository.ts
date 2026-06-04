import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';
import type {
  ElenaEngine, ElenaRunInput, ElenaRunResult, ElenaRunSummary,
  ElenaMetricRow, ElenaCascadeRow,
} from '@/modules/structural-map/domain/types/ElenaTypes';

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
    const { rootEntityId, engine, scenario, userId } = input;
    const fn = FN_MAP[engine];
    if (!fn) throw new Error(`Motor desconocido: ${engine}`);

    try {
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
      const spofRows = rows.filter((r) => r.is_spof);
      const scores   = rows.map((r) => r.metric_value).filter((v) => v != null) as number[];
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

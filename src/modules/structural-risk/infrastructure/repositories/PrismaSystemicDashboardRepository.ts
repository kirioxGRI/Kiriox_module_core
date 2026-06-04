import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';
import type {
  SystemicStats,
  SystemicAnalysisRun,
  SystemicCriticalNode,
  SystemicResilienceNode,
  SystemicExposureNode,
  SystemicSimulation,
  SystemicDashboardData,
} from '@/modules/structural-risk/domain/types/SystemicDashboardTypes';

export class PrismaSystemicDashboardRepository {
  async getDashboardData(): Promise<SystemicDashboardData> {
    const [stats, latest_runs, critical_nodes, resilience_nodes, exposure_nodes, recent_simulations] =
      await Promise.all([
        this.getStats(),
        this.getLatestRuns(),
        this.getCriticalNodes(),
        this.getResilienceNodes(),
        this.getExposureNodes(),
        this.getRecentSimulations(),
      ]);

    return { stats, latest_runs, critical_nodes, resilience_nodes, exposure_nodes, recent_simulations };
  }

  private async getStats(): Promise<SystemicStats> {
    const rows = await prisma.$queryRaw<SystemicStats[]>(Prisma.sql`
      SELECT
        (SELECT COUNT(*)::int FROM systemic_entities WHERE is_active = true)                   AS total_entities,
        (SELECT COUNT(*)::int FROM systemic_structural_analysis_runs)                          AS total_analysis_runs,
        (SELECT COUNT(*)::int FROM systemic_simulation_runs)                                   AS total_simulations,
        (SELECT COUNT(*)::int FROM systemic_structural_metrics WHERE is_critical_node = true)  AS critical_nodes_count,
        (SELECT COUNT(*)::int FROM systemic_structural_metrics WHERE is_spof = true)           AS spof_count
    `);
    const r = rows[0];
    return {
      total_entities:        Number(r?.total_entities        ?? 0),
      total_analysis_runs:   Number(r?.total_analysis_runs   ?? 0),
      total_simulations:     Number(r?.total_simulations      ?? 0),
      critical_nodes_count:  Number(r?.critical_nodes_count  ?? 0),
      spof_count:            Number(r?.spof_count             ?? 0),
    };
  }

  private async getLatestRuns(): Promise<SystemicAnalysisRun[]> {
    const rows = await prisma.$queryRaw<SystemicAnalysisRun[]>(Prisma.sql`
      SELECT DISTINCT ON (analysis_type)
        id::text, name, analysis_type, status,
        started_at, completed_at, created_at
      FROM systemic_structural_analysis_runs
      ORDER BY analysis_type, created_at DESC
    `);
    return rows.map((r) => ({
      ...r,
      id:           String(r.id),
      started_at:   r.started_at   ? String(r.started_at)   : null,
      completed_at: r.completed_at ? String(r.completed_at) : null,
      created_at:   String(r.created_at),
    }));
  }

  private async getCriticalNodes(): Promise<SystemicCriticalNode[]> {
    const rows = await prisma.$queryRaw<SystemicCriticalNode[]>(Prisma.sql`
      WITH latest_run AS (
        SELECT id FROM systemic_structural_analysis_runs
        WHERE analysis_type = 'critical_nodes_analysis' AND status = 'completed'
        ORDER BY created_at DESC LIMIT 1
      )
      SELECT
        m.entity_id::text,
        e.code,
        e.name,
        COALESCE(et.name, 'N/A')                              AS entity_type_name,
        COALESCE(m.criticality_score, 0)::float               AS criticality_score,
        m.criticality_level,
        COALESCE(m.is_critical_node, false)                   AS is_critical_node,
        COALESCE(m.total_degree, 0)::int                      AS total_degree,
        COALESCE(m.dependency_count, 0)::int                  AS dependency_count,
        COALESCE(m.dependent_count, 0)::int                   AS dependent_count,
        COALESCE(m.control_count, 0)::int                     AS control_count,
        COALESCE(m.risk_count, 0)::int                        AS risk_count,
        COALESCE(m.cascade_exposure_score, 0)::float          AS cascade_exposure_score
      FROM systemic_structural_metrics m
      JOIN systemic_entities e       ON e.id  = m.entity_id
      JOIN systemic_entity_types et  ON et.id = e.entity_type_id
      JOIN latest_run lr             ON lr.id = m.structural_analysis_run_id
      ORDER BY m.criticality_score DESC NULLS LAST
      LIMIT 10
    `);
    return rows.map((r) => ({
      ...r,
      entity_id:             String(r.entity_id),
      criticality_score:     Number(r.criticality_score ?? 0),
      is_critical_node:      Boolean(r.is_critical_node),
      total_degree:          Number(r.total_degree ?? 0),
      dependency_count:      Number(r.dependency_count ?? 0),
      dependent_count:       Number(r.dependent_count ?? 0),
      control_count:         Number(r.control_count ?? 0),
      risk_count:            Number(r.risk_count ?? 0),
      cascade_exposure_score: Number(r.cascade_exposure_score ?? 0),
    }));
  }

  private async getResilienceNodes(): Promise<SystemicResilienceNode[]> {
    const rows = await prisma.$queryRaw<SystemicResilienceNode[]>(Prisma.sql`
      WITH latest_run AS (
        SELECT id FROM systemic_structural_analysis_runs
        WHERE analysis_type = 'resilience_analysis' AND status = 'completed'
        ORDER BY created_at DESC LIMIT 1
      )
      SELECT
        m.entity_id::text,
        e.code,
        e.name,
        COALESCE(et.name, 'N/A')                          AS entity_type_name,
        COALESCE(m.is_spof, false)                        AS is_spof,
        COALESCE(m.resilience_score, 0)::float            AS resilience_score,
        m.resilience_level,
        COALESCE(m.fragility_score, 0)::float             AS fragility_score,
        COALESCE(m.has_resilience_gap, false)             AS has_resilience_gap,
        COALESCE(m.support_count, 0)::int                 AS support_count,
        COALESCE(m.alternative_support_count, 0)::int     AS alternative_support_count
      FROM systemic_structural_metrics m
      JOIN systemic_entities e       ON e.id  = m.entity_id
      JOIN systemic_entity_types et  ON et.id = e.entity_type_id
      JOIN latest_run lr             ON lr.id = m.structural_analysis_run_id
      WHERE m.is_spof = true OR m.has_resilience_gap = true
      ORDER BY COALESCE(m.resilience_score, 0) ASC
      LIMIT 10
    `);
    return rows.map((r) => ({
      ...r,
      entity_id:                  String(r.entity_id),
      is_spof:                    Boolean(r.is_spof),
      resilience_score:           Number(r.resilience_score ?? 0),
      fragility_score:            Number(r.fragility_score ?? 0),
      has_resilience_gap:         Boolean(r.has_resilience_gap),
      support_count:              Number(r.support_count ?? 0),
      alternative_support_count:  Number(r.alternative_support_count ?? 0),
    }));
  }

  private async getExposureNodes(): Promise<SystemicExposureNode[]> {
    const rows = await prisma.$queryRaw<SystemicExposureNode[]>(Prisma.sql`
      WITH latest_run AS (
        SELECT id FROM systemic_structural_analysis_runs
        WHERE analysis_type = 'structural_exposure_analysis' AND status = 'completed'
        ORDER BY created_at DESC LIMIT 1
      )
      SELECT
        m.entity_id::text,
        e.code,
        e.name,
        COALESCE(et.name, 'N/A')                        AS entity_type_name,
        COALESCE(m.exposure_score, 0)::float            AS exposure_score,
        m.exposure_level,
        COALESCE(m.has_exposure_gap, false)             AS has_exposure_gap,
        COALESCE(m.uncontrolled_risk_count, 0)::int     AS uncontrolled_risk_count,
        COALESCE(m.risk_count, 0)::int                  AS risk_count,
        COALESCE(m.total_degree, 0)::int                AS total_degree
      FROM systemic_structural_metrics m
      JOIN systemic_entities e       ON e.id  = m.entity_id
      JOIN systemic_entity_types et  ON et.id = e.entity_type_id
      JOIN latest_run lr             ON lr.id = m.structural_analysis_run_id
      ORDER BY COALESCE(m.exposure_score, 0) DESC NULLS LAST
      LIMIT 10
    `);
    return rows.map((r) => ({
      ...r,
      entity_id:              String(r.entity_id),
      exposure_score:         Number(r.exposure_score ?? 0),
      has_exposure_gap:       Boolean(r.has_exposure_gap),
      uncontrolled_risk_count: Number(r.uncontrolled_risk_count ?? 0),
      risk_count:             Number(r.risk_count ?? 0),
      total_degree:           Number(r.total_degree ?? 0),
    }));
  }

  private async getRecentSimulations(): Promise<SystemicSimulation[]> {
    const rows = await prisma.$queryRaw<SystemicSimulation[]>(Prisma.sql`
      SELECT
        sr.id::text,
        sr.name,
        sr.simulation_type,
        sr.status,
        sr.started_at,
        sr.completed_at,
        e.name   AS trigger_entity_name,
        e.code   AS trigger_entity_code,
        COUNT(si.id)::int                         AS affected_count,
        COALESCE(MAX(si.impact_score)::float, 0)  AS max_impact_score
      FROM systemic_simulation_runs sr
      LEFT JOIN systemic_entities e           ON e.id  = sr.trigger_entity_id
      LEFT JOIN systemic_simulation_impacts si ON si.simulation_run_id = sr.id
      GROUP BY sr.id, sr.name, sr.simulation_type, sr.status, sr.started_at, sr.completed_at, e.name, e.code
      ORDER BY sr.created_at DESC
      LIMIT 5
    `);
    return rows.map((r) => ({
      ...r,
      id:               String(r.id),
      started_at:       r.started_at   ? String(r.started_at)   : null,
      completed_at:     r.completed_at ? String(r.completed_at) : null,
      affected_count:   Number(r.affected_count ?? 0),
      max_impact_score: Number(r.max_impact_score ?? 0),
    }));
  }
}

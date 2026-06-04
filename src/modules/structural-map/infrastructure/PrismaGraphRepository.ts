import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';
import type { GraphEntity, GraphRelation, SubgraphData } from '@/modules/structural-map/domain/types/GraphTypes';

export class PrismaGraphRepository {
  async getSubgraph(rootEntityId: string, depth: number = 2): Promise<SubgraphData> {
    const [entities, relations] = await Promise.all([
      this.getEntities(rootEntityId, depth),
      this.getRelations(rootEntityId, depth),
    ]);
    return { root_entity_id: rootEntityId, depth, entities, relations };
  }

  private async getEntities(rootEntityId: string, depth: number): Promise<GraphEntity[]> {
    const rows = await prisma.$queryRaw<GraphEntity[]>(Prisma.sql`
      WITH RECURSIVE subgraph(entity_id, dist) AS (
        SELECT ${rootEntityId}::uuid, 0
        UNION
        SELECT
          CASE WHEN ser.source_entity_id = sg.entity_id
               THEN ser.target_entity_id ELSE ser.source_entity_id END,
          sg.dist + 1
        FROM subgraph sg
        JOIN systemic_entity_relations ser
          ON (ser.source_entity_id = sg.entity_id OR ser.target_entity_id = sg.entity_id)
          AND ser.is_active = true
        WHERE sg.dist < ${depth}
      ),
      latest_metrics AS (
        SELECT DISTINCT ON (ssm.entity_id)
          ssm.entity_id,
          ssm.criticality_score,
          ssm.resilience_score,
          ssm.exposure_score,
          ssm.is_spof,
          ssm.is_critical_node,
          ssm.total_degree
        FROM systemic_structural_metrics ssm
        ORDER BY ssm.entity_id, ssm.created_at DESC
      )
      SELECT DISTINCT
        se.id::text,
        se.code,
        se.name,
        se.description,
        se.status,
        se.criticality_level,
        se.entity_type_id::text,
        et.code AS entity_type_code,
        et.name AS entity_type_name,
        se.is_active,
        lm.criticality_score::float,
        lm.resilience_score::float,
        lm.exposure_score::float,
        COALESCE(lm.is_spof, false)         AS is_spof,
        COALESCE(lm.is_critical_node, false) AS is_critical_node,
        COALESCE(lm.total_degree, 0)::int   AS total_degree
      FROM subgraph sg
      JOIN systemic_entities se ON se.id = sg.entity_id AND se.is_active = true
      JOIN systemic_entity_types et ON et.id = se.entity_type_id
      LEFT JOIN latest_metrics lm ON lm.entity_id = se.id
    `);
    return rows.map((r) => ({
      ...r,
      id:               String(r.id),
      entity_type_id:   String(r.entity_type_id),
      is_active:        Boolean(r.is_active),
      is_spof:          Boolean(r.is_spof),
      is_critical_node: Boolean(r.is_critical_node),
      total_degree:     Number(r.total_degree ?? 0),
      criticality_score: r.criticality_score != null ? Number(r.criticality_score) : null,
      resilience_score:  r.resilience_score  != null ? Number(r.resilience_score)  : null,
      exposure_score:    r.exposure_score    != null ? Number(r.exposure_score)    : null,
    }));
  }

  private async getRelations(rootEntityId: string, depth: number): Promise<GraphRelation[]> {
    const rows = await prisma.$queryRaw<GraphRelation[]>(Prisma.sql`
      WITH RECURSIVE subgraph(entity_id, dist) AS (
        SELECT ${rootEntityId}::uuid, 0
        UNION
        SELECT
          CASE WHEN ser.source_entity_id = sg.entity_id
               THEN ser.target_entity_id ELSE ser.source_entity_id END,
          sg.dist + 1
        FROM subgraph sg
        JOIN systemic_entity_relations ser
          ON (ser.source_entity_id = sg.entity_id OR ser.target_entity_id = sg.entity_id)
          AND ser.is_active = true
        WHERE sg.dist < ${depth}
      )
      SELECT DISTINCT
        ser.id::text,
        ser.source_entity_id::text,
        ser.target_entity_id::text,
        ser.relation_type_id::text,
        rt.code AS relation_type_code,
        rt.name AS relation_type_name,
        ser.weight::float,
        ser.strength,
        ser.description,
        rt.is_directional
      FROM systemic_entity_relations ser
      JOIN systemic_relation_types rt ON rt.id = ser.relation_type_id
      JOIN subgraph s1 ON s1.entity_id = ser.source_entity_id
      JOIN subgraph s2 ON s2.entity_id = ser.target_entity_id
      WHERE ser.is_active = true
    `);
    return rows.map((r) => ({
      ...r,
      id:               String(r.id),
      source_entity_id: String(r.source_entity_id),
      target_entity_id: String(r.target_entity_id),
      relation_type_id: String(r.relation_type_id),
      is_directional:   Boolean(r.is_directional),
      weight:           r.weight != null ? Number(r.weight) : null,
    }));
  }

  async runAnalysis(rootEntityId: string, analysisType: string, userId?: string): Promise<string> {
    const fnMap: Record<string, string> = {
      structural:  'fn_elena_systemic_structural_analysis',
      criticality: 'fn_elena_systemic_criticality_analysis',
      resilience:  'fn_elena_systemic_resilience_analysis',
      exposure:    'fn_elena_systemic_exposure_analysis',
    };
    const fn = fnMap[analysisType];
    if (!fn) throw new Error(`Tipo de análisis no reconocido: ${analysisType}`);

    const rows = await prisma.$queryRaw<{ run_id: string }[]>(Prisma.sql`
      SELECT ${Prisma.raw(fn)}(
        ${rootEntityId}::uuid,
        ${userId ?? null}::uuid
      )::text AS run_id
    `);
    return String(rows[0]?.run_id ?? '');
  }

  async runCascadeSimulation(
    rootEntityId: string,
    scenario: string,
    userId?: string,
  ): Promise<{ run_id: string; affected_count: number; max_depth: number }> {
    const rows = await prisma.$queryRaw<{ run_id: string; affected_count: number; max_depth: number }[]>(Prisma.sql`
      SELECT
        r.run_id::text,
        COUNT(si.id)::int       AS affected_count,
        MAX(si.impact_depth)::int AS max_depth
      FROM (
        SELECT fn_elena_systemic_cascade_simulation(
          ${rootEntityId}::uuid,
          ${scenario},
          ${userId ?? null}::uuid
        ) AS run_id
      ) r
      LEFT JOIN systemic_simulation_impacts si ON si.simulation_run_id = r.run_id
      GROUP BY r.run_id
    `);
    const row = rows[0];
    return {
      run_id:        String(row?.run_id ?? ''),
      affected_count: Number(row?.affected_count ?? 0),
      max_depth:      Number(row?.max_depth ?? 0),
    };
  }
}

import { Prisma } from '@/generated/prisma/client';
import prisma from '@/infrastructure/db/prisma/client';
import {
  buildScopedGraphContext,
  buildScopedResilienceMetricRows,
  buildScopedCriticalityMetricRows,
  type ScopeEntityRow,
  type ScopeRelationRow,
} from '@/modules/structural-map/infrastructure/elena/scopedAnalysis';
import {
  STRESS_RELATION_CODES,
  computeFragilityScore,
  buildTopCascadeNodes,
  buildRecommendations,
  deriveNodeState,
  type ImpactedNode,
} from '@/modules/structural-map/infrastructure/stress/stressComputation';
import {
  EVENT_TYPE_SCENARIO,
  type StructuralStressRequest,
  type StructuralStressResponse,
  type StressNodeStateRow,
  type StressCascadePath,
  type AffectedEntityRef,
  type NodeState,
} from '@/modules/structural-map/domain/types/StressSimTypes';

const PROCESS_TYPES = ['PROCESS', 'ACTIVITY'];
const SERVICE_TYPES = ['SERVICE'];
const CONTROL_TYPES = ['CONTROL'];
const OBLIGATION_TYPES = ['OBLIGATION'];
const RISK_TYPES = ['RISK'];

type ImpactDbRow = {
  entity_id: string;
  entity_name: string | null;
  entity_code: string;
  entity_type_code: string;
  entity_type_name: string;
  node_state: string | null;
  impact_score: number;
  impact_depth: number;
  is_origin: boolean;
};

type PathDbRow = {
  source_entity_id: string;
  target_entity_id: string;
  target_name: string | null;
  depth_level: number;
  propagation_score: number;
  relation_code: string | null;
};

export class PrismaStressSimulationRepository {
  async run(input: StructuralStressRequest): Promise<StructuralStressResponse> {
    const scenario = EVENT_TYPE_SCENARIO[input.eventType];
    const normalizedScope = Array.from(new Set([input.sourceNodeId, ...input.scopeEntityIds].filter(Boolean)));

    const entities = await this.fetchScopeEntities(normalizedScope);
    if (!entities.some((e) => e.id === input.sourceNodeId)) {
      throw new Error('El nodo origen no existe, no está activo o no pertenece al grafo visible');
    }

    const relations = await this.fetchScopeRelations(normalizedScope);

    // Ejecuta la simulación de cascada acotada al grafo visible.
    const scopeSql = Prisma.join(normalizedScope.map((id) => Prisma.sql`${id}::uuid`));
    const runRows = await prisma.$queryRaw<{ run_id: string }[]>(Prisma.sql`
      SELECT public.fn_elena_systemic_cascade_simulation(
        ${input.sourceNodeId}::uuid,
        ${scenario},
        ${input.userId ?? null}::uuid,
        ${input.severity}::numeric,
        ${input.durationHours}::integer,
        ${input.eventType},
        ARRAY[${scopeSql}]::uuid[]
      )::text AS run_id
    `);
    const simulationId = String(runRows[0]?.run_id ?? '');
    if (!simulationId) throw new Error('La simulación no devolvió un identificador válido');

    const impactRows = await this.fetchImpacts(simulationId);
    const pathRows = await this.fetchPaths(simulationId);

    // Métricas estructurales del subgrafo visible (reutiliza los motores scoped).
    const graph = buildScopedGraphContext(input.sourceNodeId, entities, relations);
    const resilienceRows = buildScopedResilienceMetricRows(input.sourceNodeId, graph);
    const criticalityRows = buildScopedCriticalityMetricRows(input.sourceNodeId, graph);

    const impacted: ImpactedNode[] = impactRows.map((r) => ({
      entityId: r.entity_id,
      entityName: r.entity_name,
      entityCode: r.entity_code,
      entityTypeCode: r.entity_type_code,
      entityTypeName: r.entity_type_name,
      nodeState: (r.node_state as NodeState | null) ?? deriveNodeState(r.impact_score, r.is_origin),
      impactScore: r.impact_score,
      impactDepth: r.impact_depth,
      isOrigin: r.is_origin,
    }));

    const impactedNonOrigin = impacted.filter((n) => !n.isOrigin && n.nodeState !== 'NORMAL');
    const criticalNodes = impactedNonOrigin.filter((n) => n.nodeState === 'CRITICAL' || n.nodeState === 'FAILED');

    const nodeStates = this.buildNodeStates(entities, impacted);
    const cascadePaths: StressCascadePath[] = pathRows.map((p) => ({
      sourceEntityId: p.source_entity_id,
      targetEntityId: p.target_entity_id,
      targetEntityName: p.target_name,
      depthLevel: p.depth_level,
      propagationScore: p.propagation_score,
      relationCode: p.relation_code,
    }));

    return {
      ok: true,
      simulationId,
      graphId: input.graphId ?? null,
      sourceNodeId: input.sourceNodeId,
      scenario,
      eventType: input.eventType,
      severity: input.severity,
      durationHours: input.durationHours,
      impactedNodes: impactedNonOrigin.length,
      criticalNodes: criticalNodes.length,
      fragilityScore: computeFragilityScore(impacted.filter((n) => !n.isOrigin), entities.length),
      affectedProcesses: this.affectedByType(impactedNonOrigin, PROCESS_TYPES),
      affectedServices: this.affectedByType(impactedNonOrigin, SERVICE_TYPES),
      affectedControls: this.affectedByType(impactedNonOrigin, CONTROL_TYPES),
      affectedObligations: this.affectedByType(impactedNonOrigin, OBLIGATION_TYPES),
      affectedRisks: this.affectedByType(impactedNonOrigin, RISK_TYPES),
      topCascadeNodes: buildTopCascadeNodes(impacted, criticalityRows, 10),
      cascadePaths,
      recommendations: buildRecommendations(graph, impacted, resilienceRows, criticalityRows),
      nodeStates,
      executedAt: new Date().toISOString(),
    };
  }

  private buildNodeStates(entities: ScopeEntityRow[], impacted: ImpactedNode[]): StressNodeStateRow[] {
    const impactedMap = new Map(impacted.map((n) => [n.entityId, n]));
    return entities.map((e) => {
      const hit = impactedMap.get(e.id);
      return {
        entityId: e.id,
        entityName: e.name,
        entityCode: e.code,
        entityTypeCode: e.entity_type_code,
        entityTypeName: e.entity_type_name,
        nodeState: hit?.nodeState ?? 'NORMAL',
        impactScore: hit?.impactScore ?? 0,
        impactDepth: hit?.impactDepth ?? 0,
        isOrigin: hit?.isOrigin ?? false,
      };
    });
  }

  private affectedByType(impacted: ImpactedNode[], typeCodes: string[]): AffectedEntityRef[] {
    return impacted
      .filter((n) => typeCodes.includes(n.entityTypeCode))
      .map((n) => ({
        entityId: n.entityId,
        entityName: n.entityName,
        nodeState: n.nodeState,
        impactScore: n.impactScore,
      }))
      .sort((a, b) => b.impactScore - a.impactScore);
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
    return rows.map((row) => ({ ...row, id: String(row.id) }));
  }

  private async fetchScopeRelations(scopeEntityIds: string[]): Promise<ScopeRelationRow[]> {
    if (!scopeEntityIds.length) return [];
    const scopeIdsSql = Prisma.join(scopeEntityIds.map((id) => Prisma.sql`${id}::uuid`));
    const relationCodesSql = Prisma.join(STRESS_RELATION_CODES.map((code) => Prisma.sql`${code}`));
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

  private async fetchImpacts(runId: string): Promise<ImpactDbRow[]> {
    const rows = await prisma.$queryRaw<ImpactDbRow[]>(Prisma.sql`
      SELECT
        si.entity_id::text       AS entity_id,
        se.name                  AS entity_name,
        se.code                  AS entity_code,
        et.code                  AS entity_type_code,
        et.name                  AS entity_type_name,
        si.node_state,
        si.impact_score::float   AS impact_score,
        si.impact_depth::int     AS impact_depth,
        si.is_origin
      FROM systemic_simulation_impacts si
      JOIN systemic_entities se ON se.id = si.entity_id
      JOIN systemic_entity_types et ON et.id = se.entity_type_id
      WHERE si.simulation_run_id = ${runId}::uuid
      ORDER BY si.impact_depth ASC, si.impact_score DESC
    `);
    return rows.map((r) => ({
      ...r,
      entity_id: String(r.entity_id),
      impact_score: Number(r.impact_score ?? 0),
      impact_depth: Number(r.impact_depth ?? 0),
      is_origin: Boolean(r.is_origin),
    }));
  }

  private async fetchPaths(runId: string): Promise<PathDbRow[]> {
    const rows = await prisma.$queryRaw<PathDbRow[]>(Prisma.sql`
      SELECT
        pp.source_entity_id::text AS source_entity_id,
        pp.target_entity_id::text AS target_entity_id,
        te.name                   AS target_name,
        pp.depth_level::int       AS depth_level,
        pp.propagation_score::float AS propagation_score,
        rt.code                   AS relation_code
      FROM systemic_propagation_paths pp
      JOIN systemic_entities te ON te.id = pp.target_entity_id
      LEFT JOIN systemic_relation_types rt ON rt.id = pp.relation_type_id
      WHERE pp.simulation_run_id = ${runId}::uuid
      ORDER BY pp.propagation_score DESC, pp.depth_level ASC, pp.path_sequence ASC
      LIMIT 25
    `);
    return rows.map((r) => ({
      ...r,
      source_entity_id: String(r.source_entity_id),
      target_entity_id: String(r.target_entity_id),
      depth_level: Number(r.depth_level ?? 0),
      propagation_score: Number(r.propagation_score ?? 0),
    }));
  }
}

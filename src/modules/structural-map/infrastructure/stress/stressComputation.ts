/**
 * Lógica pura del Structural Stress Simulator (sin Prisma, testeable).
 *
 * Toma los impactos persistidos por `fn_elena_systemic_cascade_simulation`
 * (ya acotados al grafo visible) y el contexto del subgrafo visible para derivar
 * el Fragility Score, el Top-10 de cascada y las recomendaciones. Reutiliza las
 * métricas scoped de `scopedAnalysis.ts` (resiliencia/SPOF y criticidad/dependientes).
 */

import type {
  ScopedGraphContext,
  ScopedResilienceMetricRow,
  ScopedCriticalityMetricRow,
} from '@/modules/structural-map/infrastructure/elena/scopedAnalysis';
import type {
  NodeState,
  StressCascadeNode,
  StressRecommendation,
} from '@/modules/structural-map/domain/types/StressSimTypes';

/**
 * Conjunto de relaciones consideradas por el simulador para construir el subgrafo
 * visible (superset de las estructurales + las nuevas OWNS / PRODUCES_EVIDENCE_FOR).
 * No modifica STRUCTURAL_RELATION_CODES para no alterar los otros motores.
 */
export const STRESS_RELATION_CODES = [
  'DEPENDS_ON', 'SUPPORTS', 'USES', 'PROVIDES', 'REQUIRES', 'TRIGGERS', 'CAUSES',
  'IMPACTS', 'PROPAGATES_TO', 'AMPLIFIES', 'MITIGATES', 'REDUCES', 'MONITORS',
  'PROTECTS', 'BACKS_UP', 'RECOVERS', 'EVIDENCES', 'ASSOCIATED_WITH', 'PART_OF',
  'OWNS', 'PRODUCES_EVIDENCE_FOR',
] as const;

/** Nodo impactado tal como llega de systemic_simulation_impacts (+ metadatos de entidad). */
export type ImpactedNode = {
  entityId: string;
  entityName: string | null;
  entityCode: string;
  entityTypeCode: string;
  entityTypeName: string;
  nodeState: NodeState;
  impactScore: number;
  impactDepth: number;
  isOrigin: boolean;
};

const STATE_WEIGHT: Record<NodeState, number> = {
  FAILED: 1.0, CRITICAL: 0.75, DEGRADED: 0.5, VULNERABLE: 0.25, NORMAL: 0,
};

/** Estado a partir de un impact_score (espejo de la función SQL; el origen es FAILED). */
export function deriveNodeState(score: number, isOrigin: boolean): NodeState {
  if (isOrigin) return 'FAILED';
  if (score >= 80) return 'FAILED';
  if (score >= 60) return 'CRITICAL';
  if (score >= 40) return 'DEGRADED';
  if (score >= 20) return 'VULNERABLE';
  return 'NORMAL';
}

/**
 * Score de fragilidad estructural (0–100): cuánto colapsa el grafo visible bajo el
 * shock, como proporción ponderada de nodos comprometidos sobre el total visible.
 */
export function computeFragilityScore(impacted: ImpactedNode[], totalVisibleNodes: number): number {
  if (totalVisibleNodes <= 0) return 0;
  const weighted = impacted.reduce((acc, n) => acc + (STATE_WEIGHT[n.nodeState] ?? 0), 0);
  const score = Math.round((100 * weighted) / totalVisibleNodes);
  return Math.max(0, Math.min(100, score));
}

/** Top-N nodos con mayor efecto cascada (impacto × dependientes en el subgrafo visible). */
export function buildTopCascadeNodes(
  impacted: ImpactedNode[],
  criticalityRows: ScopedCriticalityMetricRow[],
  limit = 10,
): StressCascadeNode[] {
  const dependentsById = new Map(criticalityRows.map((r) => [r.entityId, r.dependentCount]));
  return impacted
    .filter((n) => !n.isOrigin)
    .map((n) => ({
      entityId: n.entityId,
      entityName: n.entityName,
      entityTypeCode: n.entityTypeCode,
      nodeState: n.nodeState,
      impactScore: n.impactScore,
      impactDepth: n.impactDepth,
      dependents: dependentsById.get(n.entityId) ?? 0,
    }))
    .sort((a, b) =>
      (b.impactScore * (1 + b.dependents)) - (a.impactScore * (1 + a.dependents)),
    )
    .slice(0, limit);
}

/**
 * Recomendaciones: mitigaciones de mayor palanca, dependencias críticas y SPOF,
 * todas intersectadas con el conjunto de nodos efectivamente impactados.
 */
export function buildRecommendations(
  _graph: ScopedGraphContext,
  impacted: ImpactedNode[],
  resilienceRows: ScopedResilienceMetricRow[],
  criticalityRows: ScopedCriticalityMetricRow[],
): StressRecommendation[] {
  const impactedMap = new Map(impacted.map((n) => [n.entityId, n]));
  const critById = new Map(criticalityRows.map((r) => [r.entityId, r]));
  const recs: StressRecommendation[] = [];

  // Top mitigaciones: nodos impactados (no origen) cuya contención reduce más cascada.
  const mitigations = impacted
    .filter((n) => !n.isOrigin)
    .map((n) => {
      const crit = critById.get(n.entityId);
      const dependents = crit?.dependentCount ?? 0;
      const leverage = Math.round((n.impactScore / 100) * (1 + dependents) * 100) / 100;
      return { node: n, dependents, leverage };
    })
    .filter((m) => m.dependents > 0)
    .sort((a, b) => b.leverage - a.leverage)
    .slice(0, 5);
  for (const m of mitigations) {
    recs.push({
      kind: 'MITIGATION',
      entityId: m.node.entityId,
      entityName: m.node.entityName,
      entityTypeCode: m.node.entityTypeCode,
      score: m.leverage,
      detail: `Mitigar este nodo contiene la cascada hacia ${m.dependents} dependiente(s) (impacto ${Math.round(m.node.impactScore)}).`,
    });
  }

  // Dependencias críticas: impactados con mayor número de dependientes.
  const criticalDeps = criticalityRows
    .filter((r) => impactedMap.has(r.entityId) && r.dependentCount > 0)
    .sort((a, b) => b.dependentCount - a.dependentCount)
    .slice(0, 5);
  for (const r of criticalDeps) {
    const n = impactedMap.get(r.entityId)!;
    recs.push({
      kind: 'CRITICAL_DEPENDENCY',
      entityId: r.entityId,
      entityName: n.entityName,
      entityTypeCode: n.entityTypeCode,
      score: r.dependentCount,
      detail: `Dependencia crítica: ${r.dependentCount} nodo(s) dependen de esta entidad dentro del alcance visible.`,
    });
  }

  // Puntos únicos de falla impactados.
  const spofs = resilienceRows
    .filter((r) => r.isSpof && impactedMap.has(r.entityId))
    .sort((a, b) => b.fragilityScore - a.fragilityScore)
    .slice(0, 5);
  for (const r of spofs) {
    const n = impactedMap.get(r.entityId)!;
    recs.push({
      kind: 'SPOF',
      entityId: r.entityId,
      entityName: n.entityName,
      entityTypeCode: n.entityTypeCode,
      score: r.fragilityScore,
      detail: `Punto único de falla (sin respaldo alterno) con fragilidad ${Math.round(r.fragilityScore)}.`,
    });
  }

  return recs;
}

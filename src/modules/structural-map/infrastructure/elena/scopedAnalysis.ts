type RelationCode = string;

export type ScopeEntityRow = {
  id: string;
  name: string | null;
  code: string;
  criticality_level: string | null;
  entity_type_name: string;
  entity_type_code: string;
};

export type ScopeRelationRow = {
  source_entity_id: string;
  target_entity_id: string;
  relation_code: string;
};

export type ScopedGraphContext = {
  entities: ScopeEntityRow[];
  relations: ScopeRelationRow[];
  entityMap: Map<string, ScopeEntityRow>;
  adjacency: Map<string, Set<string>>;
  incomingRelations: Map<string, ScopeRelationRow[]>;
  outgoingRelations: Map<string, ScopeRelationRow[]>;
  distancesFromRoot: Map<string, number>;
};

export type ScopedStructuralMetricRow = {
  entityId: string;
  metricType: string;
  metricValue: number;
  metricLevel: string;
  metricDetails: Record<string, unknown>;
};

export type ScopedCriticalityMetricRow = {
  entityId: string;
  metricType: 'criticality';
  metricValue: number;
  metricLevel: string;
  metricDetails: Record<string, unknown>;
  incomingCount: number;
  outgoingCount: number;
  totalDegree: number;
  dependencyCount: number;
  dependentCount: number;
  controlCount: number;
  riskCount: number;
  obligationCount: number;
  evidenceCount: number;
  cascadeExposureScore: number;
  criticalityScore: number;
  criticalityLevel: string;
  isCriticalNode: boolean;
};

export const STRUCTURAL_RELATION_CODES = [
  'DEPENDS_ON',
  'SUPPORTS',
  'USES',
  'PROVIDES',
  'REQUIRES',
  'TRIGGERS',
  'CAUSES',
  'IMPACTS',
  'PROPAGATES_TO',
  'AMPLIFIES',
  'MITIGATES',
  'REDUCES',
  'MONITORS',
  'PROTECTS',
  'BACKS_UP',
  'RECOVERS',
  'EVIDENCES',
  'ASSOCIATED_WITH',
] as const;

export type ScopedResilienceMetricRow = {
  entityId: string;
  metricType: 'resilience';
  metricValue: number;
  metricLevel: string | null;
  metricDetails: Record<string, unknown>;
  dependencyCount: number;
  dependentCount: number;
  supportCount: number;
  alternativeSupportCount: number;
  controlCount: number;
  riskCount: number;
  isSpof: boolean;
  resilienceScore: number;
  resilienceLevel: string;
  fragilityScore: number;
  hasResilienceGap: boolean;
};

export type ScopedExposureMetricRow = {
  entityId: string;
  metricType: 'structural_exposure';
  metricValue: number;
  metricLevel: string;
  metricDetails: Record<string, unknown>;
  incomingCount: number;
  outgoingCount: number;
  totalDegree: number;
  dependencyCount: number;
  dependentCount: number;
  riskCount: number;
  controlCount: number;
  obligationCount: number;
  dataCount: number;
  incidentCount: number;
  uncontrolledRiskCount: number;
  exposureScore: number;
  exposureLevel: string;
  hasExposureGap: boolean;
};

const DEPENDENCY_RELATION_CODES = ['DEPENDS_ON', 'USES', 'REQUIRES'] as const;
const SUPPORT_PROVIDER_CODES = ['SUPPORTS', 'PROVIDES'] as const;
/** Soporte entrante que aporta redundancia/respaldo (resiliencia). Espejo de la función SQL. */
const RESILIENCE_SUPPORT_CODES = ['SUPPORTS', 'PROVIDES', 'PROTECTS', 'MITIGATES'] as const;
/** Relaciones que mitigan un riesgo (un riesgo "controlado" tiene una de estas hacia/desde un CONTROL). */
const RISK_CONTROL_CODES = ['MITIGATES', 'PROTECTS'] as const;
const CRITICALITY_TYPED_CODES = ['RISK', 'CONTROL', 'OBLIGATION', 'EVIDENCE'] as const;

function criticalityBonus(level: string | null): number {
  switch ((level ?? '').toLowerCase()) {
    case 'low': return 5;
    case 'medium': return 10;
    case 'high': return 20;
    case 'critical': return 30;
    default: return 0;
  }
}

function criticalityLevelFromScore(score: number): string {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

function isDependencyRelation(code: RelationCode): boolean {
  return DEPENDENCY_RELATION_CODES.includes(code as typeof DEPENDENCY_RELATION_CODES[number]);
}

function isSupportProviderRelation(code: RelationCode): boolean {
  return SUPPORT_PROVIDER_CODES.includes(code as typeof SUPPORT_PROVIDER_CODES[number]);
}

function isResilienceSupportRelation(code: RelationCode): boolean {
  return RESILIENCE_SUPPORT_CODES.includes(code as typeof RESILIENCE_SUPPORT_CODES[number]);
}

function resilienceLevelFromScore(score: number): string {
  if (score <= 24) return 'FRAGILE';
  if (score <= 49) return 'WEAK';
  if (score <= 74) return 'RESILIENT';
  return 'HIGHLY_RESILIENT';
}

function exposureLevelFromScore(score: number): string {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

function isRiskControlRelation(code: RelationCode): boolean {
  return RISK_CONTROL_CODES.includes(code as typeof RISK_CONTROL_CODES[number]);
}

export function buildScopedGraphContext(
  rootEntityId: string,
  entities: ScopeEntityRow[],
  relations: ScopeRelationRow[],
): ScopedGraphContext {
  const entityMap = new Map(entities.map((entity) => [entity.id, entity]));
  const adjacency = new Map<string, Set<string>>();
  const incomingRelations = new Map<string, ScopeRelationRow[]>();
  const outgoingRelations = new Map<string, ScopeRelationRow[]>();

  for (const entity of entities) {
    adjacency.set(entity.id, new Set());
    incomingRelations.set(entity.id, []);
    outgoingRelations.set(entity.id, []);
  }

  for (const relation of relations) {
    adjacency.get(relation.source_entity_id)?.add(relation.target_entity_id);
    adjacency.get(relation.target_entity_id)?.add(relation.source_entity_id);
    incomingRelations.get(relation.target_entity_id)?.push(relation);
    outgoingRelations.get(relation.source_entity_id)?.push(relation);
  }

  const distancesFromRoot = new Map<string, number>();
  distancesFromRoot.set(rootEntityId, 0);
  const queue: string[] = [rootEntityId];
  while (queue.length) {
    const current = queue.shift()!;
    const currentDepth = distancesFromRoot.get(current) ?? 0;
    if (currentDepth >= 8) continue;
    for (const next of adjacency.get(current) ?? []) {
      if (!distancesFromRoot.has(next)) {
        distancesFromRoot.set(next, currentDepth + 1);
        queue.push(next);
      }
    }
  }

  return { entities, relations, entityMap, adjacency, incomingRelations, outgoingRelations, distancesFromRoot };
}

export function buildScopedStructuralMetricRows(
  rootEntityId: string,
  graph: ScopedGraphContext,
): ScopedStructuralMetricRow[] {
  const metricRows: ScopedStructuralMetricRow[] = [];

  for (const entity of graph.entities) {
    const incomingCount = graph.incomingRelations.get(entity.id)?.length ?? 0;
    const outgoingRelations = graph.outgoingRelations.get(entity.id) ?? [];
    const outgoingCount = new Set(outgoingRelations.map((relation) => relation.target_entity_id)).size;
    const totalDegree = incomingCount + outgoingCount;
    const dependencyCount = outgoingRelations.filter((relation) => isDependencyRelation(relation.relation_code)).length;
    const dependentCount = (graph.incomingRelations.get(entity.id) ?? []).filter((relation) => isDependencyRelation(relation.relation_code)).length;
    const distanceFromRoot = graph.distancesFromRoot.get(entity.id) ?? 9;
    const isSpof = dependentCount >= 1 && totalDegree >= 2;
    const structuralScore = Math.min(
      100,
      (totalDegree * 10) +
      (dependentCount * 15) +
      (dependencyCount * 5) +
      (isSpof ? 25 : 0) +
      criticalityBonus(entity.criticality_level),
    );

    metricRows.push(
      {
        entityId: entity.id,
        metricType: 'criticality',
        metricValue: structuralScore,
        metricLevel: structuralScore >= 80 ? 'critical' : structuralScore >= 60 ? 'high' : structuralScore >= 35 ? 'medium' : 'low',
        metricDetails: {
          root_entity_id: rootEntityId,
          distance_from_root: distanceFromRoot,
          incoming_relations: incomingCount,
          outgoing_relations: outgoingCount,
          total_degree: totalDegree,
          dependencies: dependencyCount,
          dependents: dependentCount,
          possible_spof: isSpof,
          structural_score: structuralScore,
        },
      },
      {
        entityId: entity.id,
        metricType: 'degree_centrality',
        metricValue: totalDegree,
        metricLevel: totalDegree >= 7 ? 'critical' : totalDegree >= 5 ? 'high' : totalDegree >= 3 ? 'medium' : 'low',
        metricDetails: {
          incoming_relations: incomingCount,
          outgoing_relations: outgoingCount,
          total_degree: totalDegree,
        },
      },
      {
        entityId: entity.id,
        metricType: 'dependency_depth',
        metricValue: distanceFromRoot,
        metricLevel: distanceFromRoot >= 4 ? 'critical' : distanceFromRoot >= 3 ? 'high' : distanceFromRoot >= 1 ? 'medium' : 'low',
        metricDetails: {
          distance_from_root: distanceFromRoot,
          dependencies: dependencyCount,
          dependents: dependentCount,
        },
      },
      {
        entityId: entity.id,
        metricType: 'spof',
        metricValue: isSpof ? 1 : 0,
        metricLevel: isSpof && dependentCount >= 3 ? 'critical' : isSpof ? 'high' : 'low',
        metricDetails: {
          possible_spof: isSpof,
          dependencies: dependencyCount,
          dependents: dependentCount,
          total_degree: totalDegree,
        },
      },
    );
  }

  return metricRows;
}

export function buildScopedCriticalityMetricRows(
  rootEntityId: string,
  graph: ScopedGraphContext,
): ScopedCriticalityMetricRow[] {
  const typedReachability = new Map<string, Record<(typeof CRITICALITY_TYPED_CODES)[number], number>>();

  for (const seed of graph.entities) {
    const visited = new Set<string>([seed.id]);
    const queue: Array<{ entityId: string; depth: number }> = [{ entityId: seed.id, depth: 0 }];
    const counts = { RISK: 0, CONTROL: 0, OBLIGATION: 0, EVIDENCE: 0 };

    while (queue.length) {
      const current = queue.shift()!;
      if (current.depth >= 8) continue;
      for (const nextId of graph.adjacency.get(current.entityId) ?? []) {
        if (visited.has(nextId)) continue;
        visited.add(nextId);
        const nextDepth = current.depth + 1;
        const nextEntity = graph.entityMap.get(nextId);
        if (nextDepth > 0 && nextEntity && nextEntity.entity_type_code in counts) {
          counts[nextEntity.entity_type_code as keyof typeof counts] += 1;
        }
        queue.push({ entityId: nextId, depth: nextDepth });
      }
    }

    typedReachability.set(seed.id, counts);
  }

  return graph.entities.map((entity) => {
    const incomingRelations = graph.incomingRelations.get(entity.id) ?? [];
    const outgoingRelations = graph.outgoingRelations.get(entity.id) ?? [];
    const incomingCount = incomingRelations.length;
    const outgoingCount = outgoingRelations.length;
    const totalDegree = incomingCount + outgoingCount;
    const dependencyCount =
      outgoingRelations.filter((relation) => isDependencyRelation(relation.relation_code)).length +
      incomingRelations.filter((relation) => isSupportProviderRelation(relation.relation_code)).length;
    const dependentCount =
      incomingRelations.filter((relation) => isDependencyRelation(relation.relation_code)).length +
      outgoingRelations.filter((relation) => isSupportProviderRelation(relation.relation_code)).length;

    const counts = typedReachability.get(entity.id) ?? { RISK: 0, CONTROL: 0, OBLIGATION: 0, EVIDENCE: 0 };
    const cascadeExposureScore = Math.min(
      100,
      (dependentCount * 20) +
      (totalDegree * 10) +
      (counts.RISK * 10) +
      (counts.OBLIGATION * 10),
    );
    const criticalityScore = Math.min(
      100,
      cascadeExposureScore +
      (dependencyCount === 0 && dependentCount > 0 ? 20 : 0) +
      (counts.CONTROL === 0 && counts.RISK > 0 ? 15 : 0),
    );
    const criticalityLevel = criticalityLevelFromScore(criticalityScore);
    const isCriticalNode = criticalityScore >= 75;

    return {
      entityId: entity.id,
      metricType: 'criticality',
      metricValue: criticalityScore,
      metricLevel: criticalityLevel.toLowerCase(),
      metricDetails: {
        root_entity_id: rootEntityId,
        incoming_count: incomingCount,
        outgoing_count: outgoingCount,
        total_degree: totalDegree,
        dependency_count: dependencyCount,
        dependent_count: dependentCount,
        risk_count: counts.RISK,
        control_count: counts.CONTROL,
        obligation_count: counts.OBLIGATION,
        evidence_count: counts.EVIDENCE,
        cascade_exposure_score: cascadeExposureScore,
        criticality_score: criticalityScore,
        criticality_level: criticalityLevel,
        is_critical_node: isCriticalNode,
      },
      incomingCount,
      outgoingCount,
      totalDegree,
      dependencyCount,
      dependentCount,
      controlCount: counts.CONTROL,
      riskCount: counts.RISK,
      obligationCount: counts.OBLIGATION,
      evidenceCount: counts.EVIDENCE,
      cascadeExposureScore,
      criticalityScore,
      criticalityLevel,
      isCriticalNode,
    };
  });
}

/**
 * Resiliencia limitada al subgrafo visible. Replica exactamente la lógica de
 * `fn_elena_systemic_resilience_analysis` (base 50, redundancia y controles suman,
 * dependientes, riesgos y SPOF restan), pero solo sobre las entidades y relaciones
 * presentes en el canvas, no en todo el grafo empresarial.
 */
export function buildScopedResilienceMetricRows(
  rootEntityId: string,
  graph: ScopedGraphContext,
): ScopedResilienceMetricRow[] {
  const typedReachability = new Map<string, { CONTROL: number; RISK: number }>();

  for (const seed of graph.entities) {
    const visited = new Set<string>([seed.id]);
    const queue: Array<{ entityId: string; depth: number }> = [{ entityId: seed.id, depth: 0 }];
    const counts = { CONTROL: 0, RISK: 0 };

    while (queue.length) {
      const current = queue.shift()!;
      if (current.depth >= 8) continue;
      for (const nextId of graph.adjacency.get(current.entityId) ?? []) {
        if (visited.has(nextId)) continue;
        visited.add(nextId);
        const nextEntity = graph.entityMap.get(nextId);
        if (nextEntity?.entity_type_code === 'CONTROL') counts.CONTROL += 1;
        if (nextEntity?.entity_type_code === 'RISK') counts.RISK += 1;
        queue.push({ entityId: nextId, depth: current.depth + 1 });
      }
    }

    typedReachability.set(seed.id, counts);
  }

  return graph.entities.map((entity) => {
    const incomingRelations = graph.incomingRelations.get(entity.id) ?? [];
    const outgoingRelations = graph.outgoingRelations.get(entity.id) ?? [];

    const dependencyCount =
      outgoingRelations.filter((relation) => isDependencyRelation(relation.relation_code)).length +
      incomingRelations.filter((relation) => isSupportProviderRelation(relation.relation_code)).length;
    const dependentCount =
      incomingRelations.filter((relation) => isDependencyRelation(relation.relation_code)).length +
      outgoingRelations.filter((relation) => isSupportProviderRelation(relation.relation_code)).length;

    const supportCount = incomingRelations.filter((relation) => isResilienceSupportRelation(relation.relation_code)).length;
    const alternativeSupportCount = Math.max(supportCount - 1, 0);
    const isSpof = dependentCount >= 1 && alternativeSupportCount === 0;

    const counts = typedReachability.get(entity.id) ?? { CONTROL: 0, RISK: 0 };

    const resilienceScore = Math.max(
      0,
      Math.min(
        100,
        50 +
        (alternativeSupportCount * 15) +
        (counts.CONTROL * 10) -
        (dependentCount * 10) -
        (counts.RISK * 8) -
        (isSpof ? 25 : 0),
      ),
    );
    const fragilityScore = 100 - resilienceScore;
    const hasResilienceGap = resilienceScore < 50 || isSpof;
    const resilienceLevel = resilienceLevelFromScore(resilienceScore);

    return {
      entityId: entity.id,
      metricType: 'resilience',
      metricValue: resilienceScore,
      metricLevel: null,
      metricDetails: {
        root_entity_id: rootEntityId,
        dependency_count: dependencyCount,
        dependent_count: dependentCount,
        support_count: supportCount,
        alternative_support_count: alternativeSupportCount,
        control_count: counts.CONTROL,
        risk_count: counts.RISK,
        is_spof: isSpof,
        resilience_score: resilienceScore,
        resilience_level: resilienceLevel,
        fragility_score: fragilityScore,
        has_resilience_gap: hasResilienceGap,
      },
      dependencyCount,
      dependentCount,
      supportCount,
      alternativeSupportCount,
      controlCount: counts.CONTROL,
      riskCount: counts.RISK,
      isSpof,
      resilienceScore,
      resilienceLevel,
      fragilityScore,
      hasResilienceGap,
    };
  });
}

/**
 * Exposición limitada al subgrafo visible. Replica exactamente la lógica de
 * `fn_elena_systemic_exposure_analysis`: cuánto está expuesta cada entidad frente a
 * riesgos, obligaciones, datos, incidentes, dependencias y, sobre todo, riesgos sin
 * control. Solo sobre las entidades y relaciones presentes en el canvas.
 */
export function buildScopedExposureMetricRows(
  rootEntityId: string,
  graph: ScopedGraphContext,
): ScopedExposureMetricRow[] {
  // Riesgos "controlados": un nodo RISK con una relación MITIGATES/PROTECTS hacia/desde un CONTROL.
  const controlledRiskIds = new Set<string>();
  for (const relation of graph.relations) {
    if (!isRiskControlRelation(relation.relation_code)) continue;
    const source = graph.entityMap.get(relation.source_entity_id);
    const target = graph.entityMap.get(relation.target_entity_id);
    if (source?.entity_type_code === 'CONTROL' && target?.entity_type_code === 'RISK') {
      controlledRiskIds.add(relation.target_entity_id);
    }
    if (target?.entity_type_code === 'CONTROL' && source?.entity_type_code === 'RISK') {
      controlledRiskIds.add(relation.source_entity_id);
    }
  }

  return graph.entities.map((entity) => {
    // Alcanzabilidad tipada (depth > 0, hasta 8 saltos), capturando los ids de RISK.
    const visited = new Set<string>([entity.id]);
    const queue: Array<{ entityId: string; depth: number }> = [{ entityId: entity.id, depth: 0 }];
    const riskIds = new Set<string>();
    const counts = { CONTROL: 0, OBLIGATION: 0, DATA: 0, INCIDENT: 0 };

    while (queue.length) {
      const current = queue.shift()!;
      if (current.depth >= 8) continue;
      for (const nextId of graph.adjacency.get(current.entityId) ?? []) {
        if (visited.has(nextId)) continue;
        visited.add(nextId);
        const nextEntity = graph.entityMap.get(nextId);
        switch (nextEntity?.entity_type_code) {
          case 'RISK': riskIds.add(nextId); break;
          case 'CONTROL': counts.CONTROL += 1; break;
          case 'OBLIGATION': counts.OBLIGATION += 1; break;
          case 'DATA': counts.DATA += 1; break;
          case 'INCIDENT': counts.INCIDENT += 1; break;
          default: break;
        }
        queue.push({ entityId: nextId, depth: current.depth + 1 });
      }
    }

    const incomingRelations = graph.incomingRelations.get(entity.id) ?? [];
    const outgoingRelations = graph.outgoingRelations.get(entity.id) ?? [];
    const incomingCount = incomingRelations.length;
    const outgoingCount = outgoingRelations.length;
    const totalDegree = incomingCount + outgoingCount;
    const dependencyCount =
      outgoingRelations.filter((relation) => isDependencyRelation(relation.relation_code)).length +
      incomingRelations.filter((relation) => isSupportProviderRelation(relation.relation_code)).length;
    const dependentCount =
      incomingRelations.filter((relation) => isDependencyRelation(relation.relation_code)).length +
      outgoingRelations.filter((relation) => isSupportProviderRelation(relation.relation_code)).length;

    const riskCount = riskIds.size;
    const uncontrolledRiskCount = Array.from(riskIds).filter((id) => !controlledRiskIds.has(id)).length;

    const exposureScore = Math.max(
      0,
      Math.min(
        100,
        (dependentCount * 15) +
        (dependencyCount * 10) +
        (riskCount * 12) +
        (counts.OBLIGATION * 10) +
        (counts.DATA * 8) +
        (counts.INCIDENT * 10) +
        (uncontrolledRiskCount * 15) -
        (counts.CONTROL * 8),
      ),
    );
    const exposureLevel = exposureLevelFromScore(exposureScore);
    const hasExposureGap = (exposureScore >= 50 && uncontrolledRiskCount > 0) || exposureScore >= 75;

    return {
      entityId: entity.id,
      metricType: 'structural_exposure',
      metricValue: exposureScore,
      metricLevel: exposureLevel.toLowerCase(),
      metricDetails: {
        root_entity_id: rootEntityId,
        incoming_count: incomingCount,
        outgoing_count: outgoingCount,
        total_degree: totalDegree,
        dependency_count: dependencyCount,
        dependent_count: dependentCount,
        risk_count: riskCount,
        control_count: counts.CONTROL,
        obligation_count: counts.OBLIGATION,
        data_count: counts.DATA,
        incident_count: counts.INCIDENT,
        uncontrolled_risk_count: uncontrolledRiskCount,
        exposure_score: exposureScore,
        exposure_level: exposureLevel,
        has_exposure_gap: hasExposureGap,
      },
      incomingCount,
      outgoingCount,
      totalDegree,
      dependencyCount,
      dependentCount,
      riskCount,
      controlCount: counts.CONTROL,
      obligationCount: counts.OBLIGATION,
      dataCount: counts.DATA,
      incidentCount: counts.INCIDENT,
      uncontrolledRiskCount,
      exposureScore,
      exposureLevel,
      hasExposureGap,
    };
  });
}

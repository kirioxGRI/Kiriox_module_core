import type { GraphEntity, GraphRelation } from '@/modules/structural-map/domain/types/GraphTypes';
import type {
  StructuralMapFilterSelection,
  StructuralMapFilterView,
  StructuralMapViewRule,
} from '@/modules/structural-map/domain/types/FilterTypes';

const ENTITY_CRITICALITY_ALIAS: Record<string, string> = {
  critical: 'critical',
  strong: 'high',
  high: 'high',
  medium: 'medium',
  low: 'low',
  weak: 'low',
};

function normalizeEntityCriticality(level: string | null | undefined): string | null {
  if (!level) return null;
  return ENTITY_CRITICALITY_ALIAS[level.toLowerCase()] ?? level.toLowerCase();
}

function shouldKeepEntityByCriticality(entity: GraphEntity, criticalityCodes: Set<string>): boolean {
  if (!criticalityCodes.size) return true;
  const entityLevel = normalizeEntityCriticality(entity.criticality_level);
  return entityLevel ? criticalityCodes.has(entityLevel) : false;
}

function getNextEntityIds(
  currentId: string,
  relation: GraphRelation,
  mode: string | null,
): string[] {
  const directional = relation.is_directional;
  const sourceMatches = relation.source_entity_id === currentId;
  const targetMatches = relation.target_entity_id === currentId;

  if (!sourceMatches && !targetMatches) return [];

  if (!directional) {
    return [sourceMatches ? relation.target_entity_id : relation.source_entity_id];
  }

  if (!mode) {
    if (sourceMatches) return [relation.target_entity_id];
    if (targetMatches) return [relation.source_entity_id];
    return [];
  }

  if (mode === 'impact') {
    if (targetMatches) return [relation.source_entity_id];
    return [];
  }

  if (mode === 'propagation_path') {
    if (sourceMatches) return [relation.target_entity_id];
    return [];
  }

  if (sourceMatches) return [relation.target_entity_id];
  return [];
}

export function applyGraphFilters(params: {
  entities: GraphEntity[];
  relations: GraphRelation[];
  rootEntityId?: string | null;
  selection: StructuralMapFilterSelection | null;
  viewRule: StructuralMapViewRule | null;
}): StructuralMapFilterView {
  const { entities, relations, rootEntityId, selection, viewRule } = params;
  if (!selection || !viewRule) {
    return { entities, relations, layoutStrategy: null };
  }

  const allowedEntityTypes = new Set(viewRule.allowed_entity_type_codes.map((code) => code.toUpperCase()));
  const allowedRelationTypes = new Set(viewRule.allowed_relation_type_codes.map((code) => code.toUpperCase()));
  const effectiveCriticality = new Set(
    (selection.criticalityCodes.length ? selection.criticalityCodes : viewRule.criticality_filter).map((code) => code.toLowerCase()),
  );

  const entityMap = new Map(entities.map((entity) => [entity.id, entity]));

  const typedRelations = relations.filter((relation) =>
    !allowedRelationTypes.size || allowedRelationTypes.has(relation.relation_type_code.toUpperCase()),
  );

  const typedEntities = entities.filter((entity) => {
    if (rootEntityId && entity.id === rootEntityId) return true;
    return !allowedEntityTypes.size || allowedEntityTypes.has(entity.entity_type_code.toUpperCase());
  });
  const typedEntityIds = new Set(typedEntities.map((entity) => entity.id));

  const scopedEntityIds = new Set<string>();
  const maxDepth = selection.depth == null
    ? Number.POSITIVE_INFINITY
    : Math.max(1, selection.depth || viewRule.default_depth || 1);

  if (!rootEntityId || !entityMap.has(rootEntityId)) {
    for (const entity of typedEntities) scopedEntityIds.add(entity.id);
  } else {
    scopedEntityIds.add(rootEntityId);
    const queue: Array<{ entityId: string; depth: number }> = [{ entityId: rootEntityId, depth: 0 }];
    const seen = new Set<string>([rootEntityId]);

    while (queue.length) {
      const current = queue.shift()!;
      if (current.depth >= maxDepth) continue;

      for (const relation of typedRelations) {
        const nextIds = getNextEntityIds(current.entityId, relation, selection.mode);
        for (const nextId of nextIds) {
          const nextEntity = entityMap.get(nextId);
          if (!nextEntity) continue;
          if (!typedEntityIds.has(nextId) && nextId !== rootEntityId) continue;
          scopedEntityIds.add(nextId);
          if (!seen.has(nextId)) {
            seen.add(nextId);
            queue.push({ entityId: nextId, depth: current.depth + 1 });
          }
        }
      }
    }
  }

  const scopedEntities = typedEntities.filter((entity) => scopedEntityIds.has(entity.id) || entity.id === rootEntityId);
  const filteredEntities = scopedEntities.filter((entity) =>
    entity.id === rootEntityId || shouldKeepEntityByCriticality(entity, effectiveCriticality),
  );
  const filteredEntityIds = new Set(filteredEntities.map((entity) => entity.id));
  const filteredRelations = typedRelations.filter((relation) =>
    filteredEntityIds.has(relation.source_entity_id) &&
    filteredEntityIds.has(relation.target_entity_id),
  );

  return {
    entities: filteredEntities,
    relations: filteredRelations,
    layoutStrategy: viewRule.layout_strategy,
  };
}

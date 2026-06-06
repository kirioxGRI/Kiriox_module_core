'use client';

import { useCallback, useEffect, useTransition, useState } from 'react';
import type { GraphEntity, GraphRelation, SubgraphData } from '@/modules/structural-map/domain/types/GraphTypes';
import type { RelationType, EntityType } from '@/modules/structural-map/domain/types/PortfolioTypes';

export type ModeloGraphData = {
  entities:      GraphEntity[];
  relations:     GraphRelation[];
  entityTypes:   EntityType[];
  relationTypes: RelationType[];
  allEntities:   GraphEntity[];
};

export function useModeloGraph(rootEntityId?: string | null) {
  const [data, setData]     = useState<ModeloGraphData | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [isPending, start]  = useTransition();

  const load = useCallback(() => {
    setError(null);
    start(async () => {
      try {
        // Si viene rootEntityId filtra por subgrafo (depth=3), si no carga todo el modelo
        const graphUrl = rootEntityId
          ? `/api/structural-map/graph?rootEntityId=${encodeURIComponent(rootEntityId)}&depth=3`
          : '/api/structural-map/modelo/graph';

        const [graphRes, catalogRes] = await Promise.all([
          fetch(graphUrl, { cache: 'no-store' }),
          fetch('/api/structural-map/services', { cache: 'no-store' }),
        ]);
        const graphText   = await graphRes.text();
        const catalogText = await catalogRes.text();
        if (!graphRes.ok)   throw new Error(graphText   || `Error HTTP ${graphRes.status}`);
        if (!catalogRes.ok) throw new Error(catalogText || `Error HTTP ${catalogRes.status}`);
        const graph   = JSON.parse(graphText)   as { entities: GraphEntity[]; relations: GraphRelation[] };
        const catalog = JSON.parse(catalogText) as { entityTypes: EntityType[]; relationTypes: RelationType[]; allEntities?: GraphEntity[] };
        setData({ entities: graph.entities, relations: graph.relations, entityTypes: catalog.entityTypes, relationTypes: catalog.relationTypes, allEntities: catalog.allEntities ?? [] });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar el grafo');
      }
    });
  }, [rootEntityId]);

  useEffect(() => { load(); }, [load]);

  const addEntity = useCallback((entity: GraphEntity) => {
    setData((prev) => prev ? { ...prev, entities: [...prev.entities, entity] } : prev);
  }, []);

  const addRelation = useCallback((relation: GraphRelation) => {
    setData((prev) => prev ? { ...prev, relations: [...prev.relations, relation] } : prev);
  }, []);

  const mergeSubgraph = useCallback((subgraph: SubgraphData) => {
    setData((prev) => {
      if (!prev) return prev;

      const entityMap = new Map(prev.entities.map((entity) => [entity.id, entity]));
      for (const entity of subgraph.entities) {
        entityMap.set(entity.id, entity);
      }

      const relationMap = new Map(prev.relations.map((relation) => [relation.id, relation]));
      for (const relation of subgraph.relations) {
        relationMap.set(relation.id, relation);
      }

      return {
        ...prev,
        entities: Array.from(entityMap.values()),
        relations: Array.from(relationMap.values()),
      };
    });
  }, []);

  const removeRelation = useCallback((id: string) => {
    setData((prev) => prev ? { ...prev, relations: prev.relations.filter((r) => r.id !== id) } : prev);
  }, []);

  const updateRelation = useCallback((id: string, patch: Partial<GraphRelation>) => {
    setData((prev) => prev ? { ...prev, relations: prev.relations.map((r) => r.id === id ? { ...r, ...patch } : r) } : prev);
  }, []);

  const removeEntity = useCallback((id: string) => {
    setData((prev) => prev ? {
      ...prev,
      entities:  prev.entities.filter((e) => e.id !== id),
      relations: prev.relations.filter((r) => r.source_entity_id !== id && r.target_entity_id !== id),
    } : prev);
  }, []);

  const updateEntity = useCallback((id: string, patch: Partial<GraphEntity>) => {
    setData((prev) => prev ? {
      ...prev,
      entities: prev.entities.map((e) => e.id === id ? { ...e, ...patch } : e),
      allEntities: prev.allEntities.map((e) => e.id === id ? { ...e, ...patch } : e),
    } : prev);
  }, []);

  return {
    data,
    error,
    isPending,
    reload: load,
    addEntity,
    addRelation,
    mergeSubgraph,
    removeRelation,
    updateRelation,
    removeEntity,
    updateEntity,
  };
}

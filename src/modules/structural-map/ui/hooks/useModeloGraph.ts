'use client';

import { useCallback, useEffect, useTransition, useState } from 'react';
import type { GraphEntity, GraphRelation } from '@/modules/structural-map/domain/types/GraphTypes';
import type { RelationType, EntityType } from '@/modules/structural-map/domain/types/PortfolioTypes';

export type ModeloGraphData = {
  entities:      GraphEntity[];
  relations:     GraphRelation[];
  entityTypes:   EntityType[];
  relationTypes: RelationType[];
};

export function useModeloGraph() {
  const [data, setData]     = useState<ModeloGraphData | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [isPending, start]  = useTransition();

  const load = useCallback(() => {
    setError(null);
    start(async () => {
      try {
        const [graphRes, catalogRes] = await Promise.all([
          fetch('/api/structural-map/modelo/graph', { cache: 'no-store' }),
          fetch('/api/structural-map/services',     { cache: 'no-store' }),
        ]);
        const graphText   = await graphRes.text();
        const catalogText = await catalogRes.text();
        if (!graphRes.ok)   throw new Error(graphText   || `Error HTTP ${graphRes.status}`);
        if (!catalogRes.ok) throw new Error(catalogText || `Error HTTP ${catalogRes.status}`);
        const graph   = JSON.parse(graphText)   as { entities: GraphEntity[]; relations: GraphRelation[] };
        const catalog = JSON.parse(catalogText) as { entityTypes: EntityType[]; relationTypes: RelationType[] };
        setData({ entities: graph.entities, relations: graph.relations, entityTypes: catalog.entityTypes, relationTypes: catalog.relationTypes });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar el grafo');
      }
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const addEntity = useCallback((entity: GraphEntity) => {
    setData((prev) => prev ? { ...prev, entities: [...prev.entities, entity] } : prev);
  }, []);

  const addRelation = useCallback((relation: GraphRelation) => {
    setData((prev) => prev ? { ...prev, relations: [...prev.relations, relation] } : prev);
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
    setData((prev) => prev ? { ...prev, entities: prev.entities.map((e) => e.id === id ? { ...e, ...patch } : e) } : prev);
  }, []);

  return { data, error, isPending, reload: load, addEntity, addRelation, removeRelation, updateRelation, removeEntity, updateEntity };
}

'use client';

import { useCallback, useEffect, useTransition, useState } from 'react';
import type { SubgraphData, AnalysisRunResult, SimulationResult } from '@/modules/structural-map/domain/types/GraphTypes';
import type { ValidationResult } from '@/modules/structural-map/domain/types/PortfolioTypes';

export function useServiceGraph(rootEntityId: string | null, initialDepth = 2) {
  const [graph, setGraph]         = useState<SubgraphData | null>(null);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [depth, setDepth]         = useState(initialDepth);
  const [isPending, startTransition] = useTransition();

  const loadGraph = useCallback((d: number) => {
    if (!rootEntityId) return;
    setGraphError(null);
    startTransition(async () => {
      try {
        const res     = await fetch(`/api/structural-map/graph?rootEntityId=${rootEntityId}&depth=${d}`, { cache: 'no-store' });
        const payload = await res.json() as SubgraphData & { error?: string };
        if (!res.ok) throw new Error(payload.error ?? 'Error al cargar grafo');
        setGraph(payload);
      } catch (e) {
        setGraphError(e instanceof Error ? e.message : 'Error inesperado');
      }
    });
  }, [rootEntityId]);

  useEffect(() => { loadGraph(depth); }, [loadGraph, depth]);

  const changeDepth = (d: number) => { setDepth(d); };

  const runAnalysis = useCallback(async (analysisType: string): Promise<AnalysisRunResult | null> => {
    if (!rootEntityId) return null;
    try {
      const res     = await fetch(`/api/structural-map/analyze/${analysisType}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootEntityId }),
      });
      const payload = await res.json() as AnalysisRunResult & { error?: string };
      if (!res.ok) throw new Error(payload.error ?? 'Error en análisis');
      loadGraph(depth);
      return payload;
    } catch (e) {
      return { run_id: '', analysis_type: analysisType, status: 'failed', message: e instanceof Error ? e.message : 'Error' };
    }
  }, [rootEntityId, depth, loadGraph]);

  const runSimulation = useCallback(async (scenario: string): Promise<SimulationResult | null> => {
    if (!rootEntityId) return null;
    try {
      const res     = await fetch('/api/structural-map/simulate/cascade', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootEntityId, scenario }),
      });
      const payload = await res.json() as SimulationResult & { error?: string };
      if (!res.ok) throw new Error(payload.error ?? 'Error en simulación');
      return payload;
    } catch (e) {
      return { run_id: '', status: 'failed', affected_count: 0, max_depth: 0, message: e instanceof Error ? e.message : 'Error' };
    }
  }, [rootEntityId]);

  const validateModel = useCallback(async (): Promise<ValidationResult | null> => {
    if (!rootEntityId) return null;
    try {
      const res     = await fetch('/api/structural-map/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootEntityId }),
      });
      const payload = await res.json() as ValidationResult & { error?: string };
      if (!res.ok) throw new Error(payload.error ?? 'Error en validación');
      return payload;
    } catch (e) {
      return null;
    }
  }, [rootEntityId]);

  const addRelation = useCallback(async (input: { source_entity_id: string; target_entity_id: string; relation_type_id: string; }): Promise<void> => {
    const res = await fetch('/api/structural-map/relations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const payload = await res.json() as { id?: string; error?: string };
    if (!res.ok) throw new Error(payload.error ?? 'Error al crear relación');
    loadGraph(depth);
  }, [depth, loadGraph]);

  return { graph, graphError, isPending, depth, changeDepth, runAnalysis, runSimulation, validateModel, addRelation, reload: () => loadGraph(depth) };
}

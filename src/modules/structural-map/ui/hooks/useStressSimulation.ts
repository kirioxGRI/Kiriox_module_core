'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  NODE_STATE_COLORS,
  type StressEventType,
  type StructuralStressResponse,
} from '@/modules/structural-map/domain/types/StressSimTypes';

export type StressConfig = {
  severity: number;
  durationHours: number;
  eventType: StressEventType;
  description: string;
};

const DEFAULT_CONFIG: StressConfig = {
  severity: 80,
  durationHours: 12,
  eventType: 'PROVIDER_OUTAGE',
  description: '',
};

type RunArgs = { sourceNodeId: string; scopeEntityIds: string[]; graphId?: string };

export function useStressSimulation() {
  const [config, setConfig] = useState<StressConfig>(DEFAULT_CONFIG);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StructuralStressResponse | null>(null);

  const updateConfig = useCallback(<K extends keyof StressConfig>(key: K, value: StressConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const run = useCallback(async ({ sourceNodeId, scopeEntityIds, graphId }: RunArgs) => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/structural-map/simulations/structural-stress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceNodeId, scopeEntityIds, graphId, ...config }),
      });
      const text = await res.text();
      const payload = text ? (JSON.parse(text) as StructuralStressResponse & { error?: string }) : null;
      if (!res.ok || !payload?.ok) {
        setError(payload?.error ?? `Error HTTP ${res.status}`);
        setResult(null);
        return;
      }
      setResult(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado ejecutando la simulación');
      setResult(null);
    } finally {
      setRunning(false);
    }
  }, [config]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  /** Mapa entityId → color por estado para pintar el canvas (NORMAL no se pinta). */
  const nodeStateColors = useMemo(() => {
    const map = new Map<string, string>();
    if (!result) return map;
    for (const n of result.nodeStates) {
      if (n.nodeState === 'NORMAL') continue;
      map.set(n.entityId, NODE_STATE_COLORS[n.nodeState]);
    }
    return map;
  }, [result]);

  return { config, updateConfig, running, error, result, run, reset, nodeStateColors };
}

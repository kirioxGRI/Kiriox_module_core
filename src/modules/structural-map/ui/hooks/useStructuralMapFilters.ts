'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  StructuralMapFilterConfig,
  StructuralMapFilterSelection,
  StructuralMapViewRule,
} from '@/modules/structural-map/domain/types/FilterTypes';

function findDefaultOptionValue(config: StructuralMapFilterConfig | null, groupCode: string): string | null {
  const group = config?.groups.find((item) => item.code === groupCode);
  if (!group) return null;
  return group.options.find((option) => option.is_default)?.value ?? group.options[0]?.value ?? null;
}

function getPersistedDepth(config: StructuralMapFilterConfig | null, selection: StructuralMapFilterSelection | null): number {
  if (!config || !selection) return 2;
  const activeRule = config.viewRules.find((rule) => rule.view_code === selection.viewCode) ?? null;
  return selection.depth
    ?? activeRule?.default_depth
    ?? Number(findDefaultOptionValue(config, 'depth') ?? 2);
}

function getPersistedMode(config: StructuralMapFilterConfig | null, selection: StructuralMapFilterSelection | null): string {
  if (!config || !selection) return 'dependencies';
  return selection.mode
    ?? findDefaultOptionValue(config, 'mode')
    ?? 'dependencies';
}

function buildInitialSelection(config: StructuralMapFilterConfig): StructuralMapFilterSelection {
  const validViewCodes = new Set(config.viewRules.map((rule) => rule.view_code));
  const preferredPreferenceView = config.preference?.default_view_code && validViewCodes.has(config.preference.default_view_code)
    ? config.preference.default_view_code
    : null;
  const preferredView = preferredPreferenceView
    ?? findDefaultOptionValue(config, 'view_selector')
    ?? config.viewRules[0]?.view_code
    ?? 'risk';
  const preferredRule = config.viewRules.find((rule) => rule.view_code === preferredView) ?? null;
  const preferredDepth = config.preference?.default_depth
    ?? preferredRule?.default_depth
    ?? Number(findDefaultOptionValue(config, 'depth') ?? 2);
  const preferredMode = config.preference?.default_mode
    ?? findDefaultOptionValue(config, 'mode')
    ?? 'dependencies';

  return {
    viewCode: preferredView,
    depth: preferredDepth,
    mode: preferredMode,
    criticalityCodes: preferredRule?.criticality_filter ?? [],
  };
}

export function useStructuralMapFilters(rootEntityId?: string | null) {
  const [config, setConfig] = useState<StructuralMapFilterConfig | null>(null);
  const [selection, setSelection] = useState<StructuralMapFilterSelection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didHydrate = useRef(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = rootEntityId ? `?entityId=${encodeURIComponent(rootEntityId)}` : '';
      const res = await fetch(`/api/structural-map/filters${query}`, { cache: 'no-store' });
      const text = await res.text();
      if (!res.ok) throw new Error(text || 'No fue posible cargar los filtros');
      const payload = JSON.parse(text) as StructuralMapFilterConfig;
      setConfig(payload);
      setSelection(buildInitialSelection(payload));
      didHydrate.current = true;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar los filtros');
    } finally {
      setIsLoading(false);
    }
  }, [rootEntityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeViewRule = useMemo<StructuralMapViewRule | null>(() => {
    if (!config || !selection) return null;
    return config.viewRules.find((rule) => rule.view_code === selection.viewCode) ?? null;
  }, [config, selection]);

  useEffect(() => {
    if (!rootEntityId || !selection || !didHydrate.current) return;

    const timeout = window.setTimeout(async () => {
      try {
        setIsSaving(true);
        await fetch('/api/structural-map/filters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityId: rootEntityId,
            defaultViewCode: selection.viewCode,
            defaultDepth: getPersistedDepth(config, selection),
            defaultMode: getPersistedMode(config, selection),
          }),
        });
      } finally {
        setIsSaving(false);
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [config, rootEntityId, selection]);

  const selectView = useCallback((viewCode: string) => {
    setSelection((prev) => {
      if (!prev || !config) return prev;
      const rule = config.viewRules.find((item) => item.view_code === viewCode);
      return {
        ...prev,
        viewCode,
        depth: rule?.default_depth ?? prev.depth,
        criticalityCodes: rule?.criticality_filter ?? [],
      };
    });
  }, [config]);

  const selectDepth = useCallback((depth: number) => {
    setSelection((prev) => prev ? { ...prev, depth: prev.depth === depth ? null : depth } : prev);
  }, []);

  const selectMode = useCallback((mode: string) => {
    setSelection((prev) => prev ? { ...prev, mode: prev.mode === mode ? null : mode } : prev);
  }, []);

  const toggleCriticality = useCallback((code: string) => {
    setSelection((prev) => {
      if (!prev) return prev;
      const exists = prev.criticalityCodes.includes(code);
      return {
        ...prev,
        criticalityCodes: exists
          ? prev.criticalityCodes.filter((value) => value !== code)
          : [...prev.criticalityCodes, code],
      };
    });
  }, []);

  const resetSelection = useCallback(() => {
    if (!config) return;
    setSelection(buildInitialSelection(config));
  }, [config]);

  return {
    config,
    selection,
    activeViewRule,
    isLoading,
    isSaving,
    error,
    reload: load,
    selectView,
    selectDepth,
    selectMode,
    toggleCriticality,
    resetSelection,
  };
}

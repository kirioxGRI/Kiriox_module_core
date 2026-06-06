'use client';

import { useEffect, useState } from 'react';

export type EntityColorMap = {
  /** Color por code de tipo de entidad (ej. CONTROL, RISK). */
  byType: Record<string, string>;
  /** Color para cualquier tipo no listado. */
  fallback: string;
};

/**
 * Mapa por defecto: CONTROL verde, RISK rojo, todo lo demás fucsia intenso.
 * Espejo del seed de `public.systemic_entity_color`. Se usa mientras carga el fetch
 * y como red de seguridad si la API falla, para que el canvas nunca quede sin color.
 */
export const DEFAULT_ENTITY_COLOR_MAP: EntityColorMap = {
  byType: {
    CONTROL: '#22c55e',
    RISK: '#ef4444',
  },
  fallback: '#d946ef',
};

/** Resuelve el color de un nodo SIEMPRE por su tipo. CONTROL/RISK tienen color propio; el resto, fucsia. */
export function resolveEntityColor(entityTypeCode: string | null | undefined, map: EntityColorMap): string {
  if (entityTypeCode && map.byType[entityTypeCode]) return map.byType[entityTypeCode];
  return map.fallback;
}

// Caché a nivel de módulo: una sola carga compartida por todo el sistema sistémico.
let cachedMap: EntityColorMap | null = null;
let inflight: Promise<EntityColorMap> | null = null;

async function fetchColorMap(): Promise<EntityColorMap> {
  if (cachedMap) return cachedMap;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch('/api/structural-map/entity-colors', { cache: 'no-store' });
      const text = await res.text();
      if (!res.ok || !text) return DEFAULT_ENTITY_COLOR_MAP;
      const payload = JSON.parse(text) as Partial<EntityColorMap>;
      cachedMap = {
        byType: payload.byType ?? DEFAULT_ENTITY_COLOR_MAP.byType,
        fallback: payload.fallback ?? DEFAULT_ENTITY_COLOR_MAP.fallback,
      };
      return cachedMap;
    } catch {
      return DEFAULT_ENTITY_COLOR_MAP;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Hook: devuelve el mapa de colores del sistema. Arranca con el default y lo refresca desde la DB. */
export function useEntityColors(): EntityColorMap {
  const [map, setMap] = useState<EntityColorMap>(cachedMap ?? DEFAULT_ENTITY_COLOR_MAP);

  useEffect(() => {
    let active = true;
    void fetchColorMap().then((resolved) => {
      if (active) setMap(resolved);
    });
    return () => { active = false; };
  }, []);

  return map;
}

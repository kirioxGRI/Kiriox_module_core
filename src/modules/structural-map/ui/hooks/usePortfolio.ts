'use client';

import { useEffect, useTransition, useState } from 'react';
import type { ServiceSummary, EntityType, RelationType } from '@/modules/structural-map/domain/types/PortfolioTypes';

type PortfolioData = { services: ServiceSummary[]; entityTypes: EntityType[]; relationTypes: RelationType[]; allEntities: any[] };

export function usePortfolio() {
  const [data, setData]   = useState<PortfolioData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res     = await fetch('/api/structural-map/services', { cache: 'no-store' });
        const payload = await res.json() as PortfolioData & { error?: string };
        if (!res.ok) throw new Error(payload.error ?? 'Error al cargar servicios');
        setData(payload);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error inesperado');
      }
    });
  };

  useEffect(() => { load(); }, []);
  return { data, error, isPending, reload: load };
}

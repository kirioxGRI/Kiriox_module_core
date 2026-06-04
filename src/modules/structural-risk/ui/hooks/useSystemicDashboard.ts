'use client';

import { useEffect, useTransition, useState } from 'react';
import type { SystemicDashboardData } from '@/modules/structural-risk/domain/types/SystemicDashboardTypes';

export function useSystemicDashboard() {
  const [data, setData] = useState<SystemicDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/structural-risk/systemic-dashboard', { cache: 'no-store' });
        const payload: unknown = await res.json();
        if (!res.ok) throw new Error((payload as { error?: string })?.error ?? 'Error al cargar el dashboard sistémico.');
        setData(payload as SystemicDashboardData);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error inesperado');
      }
    });
  }, []);

  return { data, error, isPending };
}

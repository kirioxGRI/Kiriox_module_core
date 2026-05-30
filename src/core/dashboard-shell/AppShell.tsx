"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import type { ResolvedNavigationItem } from '@/core/navigation';
import type { AccessContext } from '@/shared/types';
import { CommandSearchProvider } from '@/shared/ui/command-search/CommandSearchProvider';

type AppShellProps = {
  children: React.ReactNode;
  initialAccess?: AccessContext | null;
};

export default function AppShell({ children, initialAccess }: AppShellProps) {
  const TAB_SESSION_KEY = 'kiriox_tab_session_active';
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname === '/login';
  const isImmersive = pathname === '/main_dashboard' || pathname.startsWith('/score/simulacion') || pathname.startsWith('/app-simulation');

  const [access, setAccess] = useState<AccessContext | null>(initialAccess ?? null);
  const [navigation, setNavigation] = useState<ResolvedNavigationItem[]>(
    initialAccess?.navigation ?? []
  );
  // If we got server-side data, start as not loading — sidebar renders immediately.
  const [loadingAccess, setLoadingAccess] = useState(!initialAccess);

  useEffect(() => {
    // Already hydrated from SSR — no client fetch needed.
    if (initialAccess) {
      setLoadingAccess(false);
      return;
    }

    let alive = true;

    const loadAccessContext = async () => {
      if (isLogin || isImmersive) {
        if (alive) setLoadingAccess(false);
        return;
      }

      // Check sessionStorage cache first — avoids HTTP round-trip + 6 DB queries
      // on every mount when SSR data wasn't available. TTL: 5 minutes.
      const CACHE_KEY = 'kiriox_access_ctx';
      const CACHE_TTL = 5 * 60 * 1000;
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { ts, data } = JSON.parse(cached) as { ts: number; data: AccessContext };
          if (Date.now() - ts < CACHE_TTL) {
            if (alive) { setAccess(data); setNavigation(data.navigation ?? []); setLoadingAccess(false); }
            return;
          }
        }
      } catch { /* sessionStorage unavailable */ }

      try {
        const response = await fetch('/api/auth/access-context', {
          method: 'GET',
          credentials: 'include',
        });

        if (!alive) return;
        if (!response.ok) {
          sessionStorage.removeItem(CACHE_KEY);
          setAccess(null);
          setNavigation([]);
          router.replace('/login');
          return;
        }

        const data = (await response.json()) as AccessContext;
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch { /* quota */ }
        setAccess(data);
        setNavigation(data.navigation);
      } catch {
        if (!alive) return;
        setAccess(null);
        setNavigation([]);
        router.replace('/login');
      } finally {
        if (alive) setLoadingAccess(false);
      }
    };

    void loadAccessContext();
    return () => { alive = false; };
  }, [TAB_SESSION_KEY, initialAccess, isImmersive, isLogin, router]);

  if (isLogin || isImmersive) {
    return <>{children}</>;
  }

  const activeModule = navigation.find((item) =>
    pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  const mainBg = activeModule?.backgroundColor ?? '#182f62';

  return (
    <div className="layout-wrapper">
      <CommandSearchProvider>
        <Sidebar items={navigation} loading={loadingAccess} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
          <Topbar access={access} showScopeSelectors={false} />
          <main className="main-content" style={{ background: mainBg }}>
            <div className="content-inner">{children}</div>
          </main>
        </div>
      </CommandSearchProvider>
    </div>
  );
}

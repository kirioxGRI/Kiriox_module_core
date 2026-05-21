"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import type { ResolvedNavigationItem } from '@/core/navigation';
import type { AccessContext } from '@/shared/types';
import { CommandSearchProvider } from '@/shared/ui/command-search/CommandSearchProvider';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const TAB_SESSION_KEY = 'kiriox_tab_session_active';
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname === '/login';
  const isImmersive = pathname === '/main_dashboard' || pathname.startsWith('/score/simulacion') || pathname.startsWith('/app-simulation');

  const [access, setAccess] = useState<AccessContext | null>(null);
  const [navigation, setNavigation] = useState<ResolvedNavigationItem[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(true);

  useEffect(() => {
    let alive = true;

    const loadAccessContext = async () => {
      if (isLogin || isImmersive) {
        if (alive) setLoadingAccess(false);
        return;
      }

      // Reset antes del fetch para evitar redirect prematuro al venir de ruta inmersiva
      if (alive) setLoadingAccess(true);

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(TAB_SESSION_KEY, '1');
      }

      try {
        const response = await fetch('/api/auth/access-context', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (!alive) return;
        if (!response.ok) {
          setAccess(null);
          setNavigation([]);
          return;
        }

        const data = (await response.json()) as AccessContext;
        setAccess(data);
        setNavigation(data.navigation);
      } catch {
        if (!alive) return;
        setAccess(null);
        setNavigation([]);
      } finally {
        if (alive) setLoadingAccess(false);
      }
    };

    void loadAccessContext();
    return () => { alive = false; };
  }, [TAB_SESSION_KEY, isImmersive, isLogin, router]);

  useEffect(() => {
    if (isLogin || isImmersive) return;
    if (!loadingAccess && !access) {
      router.replace('/login');
    }
  }, [access, isImmersive, isLogin, loadingAccess, router]);

  if (isLogin || isImmersive) {
    return <>{children}</>;
  }

  return (
    <div className="layout-wrapper">
      <CommandSearchProvider>
        <Sidebar items={navigation} loading={loadingAccess} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
          <Topbar access={access} showScopeSelectors={false} />
          <main className="main-content">
            <div className="content-inner">{children}</div>
          </main>
        </div>
      </CommandSearchProvider>
    </div>
  );
}

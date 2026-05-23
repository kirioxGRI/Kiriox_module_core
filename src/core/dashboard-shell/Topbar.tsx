"use client";

import { Bell, FileText, LayoutGrid, Lock, LogOut, Moon, ShieldCheck, Sun, User } from "lucide-react";
import { useTheme } from "@/core/layout/ThemeContext";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AccessContext } from "@/shared/types";

type TopbarProps = {
  access?: AccessContext | null;
  showScopeSelectors?: boolean;
};

export default function Topbar({ access, showScopeSelectors = false }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch('/api/monitoring/count')
      .then((r) => r.json())
      .then((d: { ok: boolean; count: number }) => { if (d.ok) setAlertCount(d.count); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include', cache: 'no-store' });
    } catch {
      // ignore
    } finally {
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
        localStorage.clear();
      }
      router.replace('/login');
      window.location.assign('/login');
    }
  };

  return (
    <header style={{
      padding: '0.75rem 2rem', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: '1rem',
      borderBottom: 'none',
      background: '#1e3d7a',
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
        <div style={{ flex: 0.5, color: 'white', fontSize: '1rem', fontWeight: 500, letterSpacing: '0.02em', fontStyle: 'italic', opacity: 0.9 }}>
          <span style={{ color: '#2563eb', fontWeight: 700 }}>Kiriox</span>, identifica lo que puede romper una Organización, antes de que ocurra.
        </div>
        {showScopeSelectors && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <ScopeSelector label="Jurisdiccion" value="Republica Dominicana" />
            <ScopeSelector label="Empresa" value="Todas" />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <button onClick={toggleTheme} style={iconBtnStyle} title={mounted ? (theme === 'dark' ? "Modo Claro" : "Modo Oscuro") : ""}>
          {mounted ? (theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />) : <Sun size={20} />}
        </button>
        <Link href="/gestion/dashboard_monitoreo" style={{ ...iconBtnStyle, position: 'relative', textDecoration: 'none' }} title="Monitoreo de alertas">
          <Bell size={20} />
          {alertCount > 0 && (
            <span style={{
              position: 'absolute', bottom: -8, right: -6,
              minWidth: 17, height: 17, borderRadius: 99,
              background: '#ef4444', color: '#fff', fontSize: '0.6rem',
              fontWeight: 800, display: 'flex', alignItems: 'center',
              justifyContent: 'center', padding: '0 3px', lineHeight: 1,
              boxShadow: '0 0 0 2px var(--background)',
            }}>
              {alertCount > 99 ? '99+' : alertCount}
            </span>
          )}
        </Link>
        <Link href="/main_dashboard" style={{ ...iconBtnStyle, textDecoration: 'none' }} title="Dashboard principal">
          <LayoutGrid size={20} />
        </Link>
        <div ref={menuRef} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '1rem', borderLeft: '1px solid var(--glass-border)', position: 'relative' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>{access?.user?.name || 'Usuario'}</p>
            <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>{access?.company?.name || 'Empresa activa'}</p>
          </div>
          <button
            onClick={() => setMenuOpen((open) => !open)}
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
            aria-label="User menu"
          >
            <User size={20} color="white" />
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', top: '56px', right: 0, minWidth: '220px',
              background: 'rgba(15,23,42,0.98)', border: '1px solid var(--glass-border)',
              borderRadius: '12px', padding: '0.5rem',
              boxShadow: '0 12px 24px rgba(0,0,0,0.4)', zIndex: 100,
            }}>
              <MenuLink href="/main_dashboard" icon={<LayoutGrid size={16} />}>Main dashboard</MenuLink>
              <div style={{ height: 1, background: 'var(--glass-border)', margin: '0.5rem 0' }} />
              <MenuLink href="/gestion/dashboard_riesgo_estructural" icon={<FileText size={16} />}>Riesgo estructural</MenuLink>
              <MenuLink href="/gestion/dashboard_riesgo_lineal" icon={<ShieldCheck size={16} />}>Riesgo lineal</MenuLink>
              <MenuLink href="/admin/usuarios" icon={<Lock size={16} />}>Seguridad</MenuLink>
              <div style={{ height: 1, background: 'var(--glass-border)', margin: '0.5rem 0' }} />
              <button
                onClick={handleLogout}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.75rem', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function ScopeSelector({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', borderRadius: '10px' }}>
      <span style={{ opacity: 0.6 }}>{label}:</span>
      <span style={{ fontWeight: '600' }}>{value}</span>
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--foreground)',
  cursor: 'pointer', opacity: 0.7, transition: 'opacity 0.2s',
  display: 'flex', alignItems: 'center',
};

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.75rem', color: 'white', textDecoration: 'none' }}>
      {icon} {children}
    </Link>
  );
}

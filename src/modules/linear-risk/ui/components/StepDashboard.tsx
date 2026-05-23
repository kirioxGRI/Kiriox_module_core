'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FolderOpen,
  Loader2,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ClipboardList,
  Trash2,
} from 'lucide-react';
import type { LinearRiskEvaluation } from '../../domain/types';

type EvalItem = LinearRiskEvaluation;

type DashboardStats = {
  total: number;
  borrador: number;
  en_proceso: number;
  finalizada: number;
  en_tratamiento: number;
};

function avatarBg(initials: string): string {
  const palette = ['#6366f1', '#14b8a6', '#f43f5e', '#22c55e', '#f59e0b', '#8b5cf6', '#3b82f6', '#ec4899'];
  return palette[(initials.charCodeAt(0) || 0) % palette.length];
}

function progressColor(status: string): string {
  if (status === 'EN PROCESO') return '#f59e0b';
  if (status === 'EN TRATAMIENTO') return '#ef4444';
  if (status === 'COMPLETADA') return '#a78bfa';
  return '#3b82f6';
}

import { PluginZone } from '@/core/plugin-engine/PluginZone';

export function StepDashboard({
  onNewEvaluation,
  onOpenEvaluation,
  creating,
}: {
  onNewEvaluation: () => Promise<void>;
  onOpenEvaluation: (id: string, code: string) => void;
  creating: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isSimulationsDashboard = pathname === '/gestion/dashboard_simulaciones';
  const [stats, setStats] = React.useState<DashboardStats>({ total: 0, borrador: 0, en_proceso: 0, finalizada: 0, en_tratamiento: 0 });
  const [evals, setEvals] = React.useState<EvalItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isHandover = urlParams.get('launchWizard') === 'true';

    if (!isHandover) {
      sessionStorage.removeItem('KIRIOX_PRESELECTED_PROCESS_ID');
      sessionStorage.removeItem('KIRIOX_PRESELECTED_ACTIVITY_ID');
      sessionStorage.removeItem('KIRIOX_PRESELECTED_PROCESS_NAME');
    }
  }, []);

  React.useEffect(() => {
    fetch('/api/linear-risk/evaluations')
      .then((r) => r.json())
      .then((d: { stats: DashboardStats; evaluations: EvalItem[] }) => {
        setStats(d.stats);
        setEvals(d.evaluations);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`¿Está seguro de eliminar permanentemente la evaluación ${code}? Esta acción no se puede deshacer y eliminará todos los riesgos, controles y evidencias asociados.`)) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/linear-risk/run-ra', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error('Error al eliminar');

      const r = await fetch('/api/linear-risk/evaluations');
      const d = await r.json();
      setStats(d.stats);
      setEvals(d.evaluations);
    } catch (err) {
      console.error(err);
      alert('Error: No se pudo completar la eliminación en cascada.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = evals.filter((ev) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return ev.code.toLowerCase().includes(q) || ev.title.toLowerCase().includes(q) || ev.scope.toLowerCase().includes(q) || ev.responsible.toLowerCase().includes(q);
  });

  const pageItems = filtered;

  const statCards = [
    { label: 'Evaluaciones realizadas', value: stats.total, sub: 'Total', color: '#6366f1', Icon: ClipboardList },
    { label: 'En borrador', value: stats.borrador, sub: null, color: '#22c55e', Icon: Pencil },
    { label: isSimulationsDashboard ? 'Fallas de controles' : 'En proceso', value: stats.en_proceso, sub: null, color: '#f59e0b', Icon: RefreshCw },
    { label: isSimulationsDashboard ? 'Monte carlo' : 'Finalizadas', value: stats.finalizada, sub: null, color: '#a78bfa', Icon: CheckCircle2 },
    { label: isSimulationsDashboard ? 'Var paramétrico' : 'Pendientes de tratamiento', value: stats.en_tratamiento, sub: null, color: '#ef4444', Icon: AlertCircle },
  ];

  const simulationCardRouteByLabel: Record<string, string> = {
    'Fallas de controles': '/app-simulation',
    'Monte carlo': '/score/simulacion/monte-carlo',
    'Var paramétrico': '/app-simulation-Liquidez',
  };

  return (
    <div style={{ minHeight: '100%', background: 'transparent', fontFamily: 'inherit' }}>
      <div style={{ padding: '2.5rem 2.5rem 2rem', background: 'transparent' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem', letterSpacing: '0.02em' }}>
              <Shield size={13} /> Riesgos lineales
            </div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.03em', lineHeight: 1.1 }}>Evaluaciones de riesgo</h1>
            <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.83rem' }}>Gestione, consulte e inicie evaluaciones de riesgo lineal.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.55rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button
                onClick={onNewEvaluation}
                disabled={creating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.4rem',
                  borderRadius: 12,
                  background: creating ? 'rgba(59,130,246,0.3)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: '1px solid rgba(59,130,246,0.4)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: creating ? 'wait' : 'pointer',
                  boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
                }}
              >
                {creating ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={15} />}
                Nueva evaluación
              </button>
              <button
                onClick={() => router.push('/score/dashboard2')}
                style={{
                  padding: '0.65rem 1.2rem',
                  borderRadius: 12,
                  background: 'rgba(0,0,0,0.18)',
                  border: '1px solid rgba(148,163,184,0.3)',
                  color: '#cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.9rem' }}>
          {statCards.map((card) => {
            const pct = stats.total > 0 ? ((card.value / stats.total) * 100).toFixed(1) : '0';
            const clickRoute = isSimulationsDashboard ? simulationCardRouteByLabel[card.label] : undefined;
            return (
              <div
                key={card.label}
                style={{
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(0,0,0,0.18)',
                  padding: '1.1rem 1.2rem 0.9rem',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: clickRoute ? 'pointer' : 'default',
                }}
                onClick={clickRoute ? () => router.push(clickRoute) : undefined}
              >
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${card.color}88, ${card.color}22)` }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.8rem' }}>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, lineHeight: 1.3, maxWidth: '70%' }}>{card.label}</p>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: `${card.color}22`,
                      border: `1px solid ${card.color}44`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <card.Icon size={16} color={card.color} />
                  </div>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#f1f5f9', lineHeight: 1, letterSpacing: '-0.03em' }}>{card.value}</div>
                <div style={{ marginTop: '0.3rem', fontSize: '0.7rem', fontWeight: 700, color: card.sub ? '#64748b' : card.color }}>{card.sub ? card.sub : `${pct}% del total`}</div>
              </div>
            );
          })}
        </div>

        <PluginZone pointId="linear-risk:dashboard:widget" label="Extensiones activas del módulo" />

        <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.18)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.3rem', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: '0.7rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#e2e8f0' }}>Listado de evaluaciones</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '0.45rem 0.8rem' }}>
                <Search size={13} color="#475569" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                  }}
                  placeholder="Buscar evaluación…"
                  style={{ background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '0.8rem', width: 200, fontFamily: 'inherit' }}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', color: '#475569' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.82rem' }}>Cargando evaluaciones…</span>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', color: '#cbd5e1' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                    {['Código', 'Objetivo', 'Proceso', 'Responsable', 'Estado', 'Fecha de creación', 'Actualización', 'Avance', 'Acción'].map((h) => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#475569', fontSize: '0.82rem' }}>
                        No se encontraron evaluaciones
                      </td>
                    </tr>
                  )}
                  {pageItems.map((ev, idx) => {
                    const pColor = progressColor(ev.status);
                    const aBg = avatarBg(ev.initials);
                    return (
                      <tr key={ev.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', transition: 'background 0.15s' }}>
                        <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#60a5fa', fontWeight: 700, fontSize: '0.75rem' }}>{ev.code}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', maxWidth: 200 }}>
                          <span style={{ color: '#e2e8f0', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{ev.title}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', maxWidth: 140, color: '#94a3b8' }}>
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.scope || '—'}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                          {ev.responsible ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: aBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>{ev.initials}</div>
                              <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{ev.responsible}</span>
                            </div>
                          ) : (
                            <span style={{ color: '#475569' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.22rem 0.65rem',
                              borderRadius: 6,
                              background: `${ev.status_color}22`,
                              border: `1px solid ${ev.status_color}55`,
                              color: ev.status_color,
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              letterSpacing: '0.04em',
                            }}
                          >
                            {ev.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', color: '#94a3b8' }}>
                          {ev.created_at ? (
                            <div>
                              <div style={{ color: '#cbd5e1', fontWeight: 600 }}>{ev.created_at.split(' ')[0]}</div>
                              <div style={{ fontSize: '0.65rem', color: '#475569' }}>{ev.created_at.split(' ')[1]}</div>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                          {ev.updated_at ? (
                            <div>
                              <div style={{ color: '#cbd5e1', fontWeight: 600 }}>{ev.updated_at.split(' ')[0]}</div>
                              <div style={{ fontSize: '0.65rem', color: '#475569' }}>{ev.updated_at.split(' ')[1]}</div>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', minWidth: 110 }}>
                          <div style={{ color: pColor, fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem' }}>{ev.progress}%</div>
                          <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.06)', width: 80 }}>
                            <div style={{ height: '100%', borderRadius: 999, background: pColor, width: `${ev.progress}%`, transition: 'width 0.4s ease' }} />
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <button
                              onClick={() => onOpenEvaluation(ev.id, ev.code)}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 7,
                                cursor: 'pointer',
                                background: ev.status === 'COMPLETADA'
                                  ? 'rgba(167,139,250,0.12)'
                                  : ev.status === 'EN TRATAMIENTO'
                                    ? 'rgba(239,68,68,0.1)'
                                    : 'rgba(59,130,246,0.12)',
                                border: ev.status === 'COMPLETADA'
                                  ? '1px solid rgba(167,139,250,0.3)'
                                  : ev.status === 'EN TRATAMIENTO'
                                    ? '1px solid rgba(239,68,68,0.28)'
                                    : '1px solid rgba(59,130,246,0.3)',
                                color: ev.status === 'COMPLETADA'
                                  ? '#a78bfa'
                                  : ev.status === 'EN TRATAMIENTO'
                                    ? '#f87171'
                                    : '#60a5fa',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title={ev.status === 'COMPLETADA' ? 'Ver' : ev.status === 'EN TRATAMIENTO' ? 'Abrir' : 'Continuar'}
                            >
                              {ev.status === 'COMPLETADA' ? <Eye size={13} /> : ev.status === 'EN TRATAMIENTO' ? <FolderOpen size={13} /> : <Play size={13} />}
                            </button>
                            <button
                              onClick={() => onOpenEvaluation(ev.id, ev.code)}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 7,
                                cursor: 'pointer',
                                background: 'rgba(167,139,250,0.12)',
                                border: '1px solid rgba(167,139,250,0.3)',
                                color: '#a78bfa',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Ver"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(ev.id, ev.code)}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 7,
                                cursor: 'pointer',
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#f87171',
                              }}
                              title="Eliminar evaluación"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Network, Plus, ClipboardList, Pencil, RefreshCw, CheckCircle2, AlertCircle, Eye, Trash2, Play } from 'lucide-react';
import { PluginZone } from '@/core/plugin-engine/PluginZone';

type DashboardStats = {
  total: number;
  borrador: number;
  en_proceso: number;
  finalizada: number;
  en_tratamiento: number;
};

type EvalItem = {
  id: string;
  code: string;
  title: string;
  scope: string;
  responsible: string;
  initials: string;
  status: string;
  status_color: string;
  lifecycle_code: string;
  created_at: string;
  updated_at: string;
  progress: number;
};

type StructuralRunRow = {
  id: string;
  code: string;
  title: string;
  scope_type: string;
  methodology: string;
  status: string;
  version: number;
  assessment_date: string;
  created_at: string;
  updated_at: string;
  lifecycle_code: string | null;
  lifecycle_name: string | null;
};

function lifecycleColor(code: string | null): string {
  switch (code) {
    case 'IN_PROGRESS':  return '#f59e0b';
    case 'IN_TREATMENT': return '#ef4444';
    case 'COMPLETED':    return '#a78bfa';
    case 'CANCELLED':    return '#f43f5e';
    case 'REOPENED':     return '#22d3ee';
    case 'DELETED':      return '#475569';
    default:             return '#64748b';
  }
}

const CARD: React.CSSProperties = {
  background: 'rgba(0,0,0,0.18)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 14,
  boxShadow: '0 12px 30px rgba(2,8,23,0.2)',
};

function avatarBg(initials: string): string {
  const palette = ['#6366f1', '#14b8a6', '#f43f5e', '#22c55e', '#f59e0b', '#8b5cf6', '#3b82f6', '#ec4899'];
  return palette[(initials.charCodeAt(0) || 0) % palette.length];
}

export default function StructuralRiskDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ total: 0, borrador: 0, en_proceso: 0, finalizada: 0, en_tratamiento: 0 });
  const [completedEvals, setCompletedEvals] = useState<EvalItem[]>([]);
  const [structuralRuns, setStructuralRuns] = useState<StructuralRunRow[]>([]);
  const [loadingStructural, setLoadingStructural] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingFromLinear, setCreatingFromLinear] = useState<string | null>(null);

  async function handleNewEvaluation() {
    setCreating(true);
    try {
      const res = await fetch('/api/structural-risk/wizard-run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json() as { runSaId?: string; error?: string };
      if (!res.ok || !data.runSaId) throw new Error(data.error || 'No se pudo crear la evaluación.');
      router.push(`/gestion/wizard_captura_estructural?runSaId=${encodeURIComponent(data.runSaId)}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al crear la evaluación.');
      setCreating(false);
    }
  }

  async function handleCreateFromLinear(linearEvalId: string) {
    if (!window.confirm('¿Desea crear una evaluación estructural a partir de esta evaluación lineal?')) return;
    setCreatingFromLinear(linearEvalId);
    try {
      const res = await fetch('/api/structural-risk/wizard-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromLinearEvalId: linearEvalId })
      });
      const data = await res.json() as { runSaId?: string; error?: string };
      if (!res.ok || !data.runSaId) throw new Error(data.error || 'No se pudo crear la evaluación.');
      router.push(`/gestion/wizard_captura_estructural?runSaId=${encodeURIComponent(data.runSaId)}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al crear la evaluación.');
      setCreatingFromLinear(null);
    }
  }

  useEffect(() => {
    fetch('/api/context/evaluations-list')
      .then((r) => r.json())
      .then((d: { stats: DashboardStats; evaluations: EvalItem[] }) => {
        if (d.stats) setStats(d.stats);
        if (d.evaluations) {
          setCompletedEvals(d.evaluations.filter((e) => e.lifecycle_code === 'COMPLETED'));
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/structural-risk/wizard-run')
      .then((r) => r.json())
      .then((d: { runs?: StructuralRunRow[] }) => {
        setStructuralRuns(d.runs ?? []);
      })
      .catch(() => undefined)
      .finally(() => setLoadingStructural(false));
  }, []);

  async function handleDeleteStructural(runSaId: string, code: string) {
    if (!window.confirm(`¿Eliminar permanentemente la evaluación estructural ${code}? Esta acción no se puede deshacer.`)) return;
    setDeletingId(runSaId);
    try {
      const res = await fetch('/api/structural-risk/wizard-run', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runSaId }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Error al eliminar.');
      setStructuralRuns((prev) => prev.filter((r) => r.id !== runSaId));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al eliminar la evaluación.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main style={{ minHeight: '100%', padding: '1.2rem 1.5rem', background: 'transparent' }}>
      <section style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginBottom: '0.8rem' }}>
        <button
          onClick={() => void handleNewEvaluation()}
          disabled={creating}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.62rem 1.2rem',
            borderRadius: 12,
            border: '1px solid rgba(96,165,250,0.45)',
            background: creating ? 'rgba(59,130,246,0.4)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 800,
            cursor: creating ? 'wait' : 'pointer',
          }}
        >
          <Plus size={15} />
          {creating ? 'Creando…' : 'Nueva evaluación'}
        </button>
        <button
          onClick={() => router.push('/score/dashboard2')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.62rem 1.2rem',
            borderRadius: 12,
            border: '1px solid rgba(148,163,184,0.35)',
            background: 'rgba(0,0,0,0.18)',
            color: '#e2e8f0',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Cerrar
        </button>
      </section>

      <section style={{ ...CARD, padding: '1rem 1.2rem', marginBottom: '0.9rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(99,102,241,0.16)', border: '1px solid rgba(99,102,241,0.36)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Network size={20} color="#a5b4fc" />
          </div>
          <div>
            <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '1.25rem', letterSpacing: '-0.02em' }}>Dashboard riesgo estructural</h1>
            <p style={{ margin: '0.15rem 0 0', color: '#93c5fd', fontSize: '0.8rem' }}>Vista consolidada basada en evaluación de riesgo lineal.</p>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.9rem', marginBottom: '0.9rem' }}>
        {[
          { label: 'Evaluaciones lineales',   value: completedEvals.length, sub: 'Completadas', color: '#6366f1', Icon: ClipboardList },
          { label: 'Evaluaciones estructurales', value: structuralRuns.length, sub: 'Total', color: '#22c55e', Icon: Pencil },
          { label: 'Procesos críticos',  value: stats.en_proceso,     sub: null, color: '#f59e0b', Icon: RefreshCw },
          { label: 'Controles críticos', value: stats.finalizada,     sub: null, color: '#a78bfa', Icon: CheckCircle2 },
          { label: 'Concentraciones',    value: stats.en_tratamiento, sub: null, color: '#ef4444', Icon: AlertCircle },
        ].map((card) => {
          const pct = stats.total > 0 ? ((card.value / stats.total) * 100).toFixed(1) : '0';
          return (
            <div key={card.label} style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.18)', padding: '1.1rem 1.2rem 0.9rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${card.color}88, ${card.color}22)` }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.8rem' }}>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, lineHeight: 1.3, maxWidth: '70%' }}>{card.label}</p>
                <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: `${card.color}22`, border: `1px solid ${card.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <card.Icon size={16} color={card.color} />
                </div>
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#f1f5f9', lineHeight: 1, letterSpacing: '-0.03em' }}>{card.value}</div>
              <div style={{ marginTop: '0.3rem', fontSize: '0.7rem', fontWeight: 700, color: card.sub ? '#64748b' : card.color }}>{card.sub ?? `${pct}% del total`}</div>
            </div>
          );
        })}
      </section>

      <PluginZone pointId="structural-risk:dashboard:widget" label="Extensiones activas del módulo" />

      <section style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.7rem 1rem', borderBottom: '1px solid rgba(71,85,105,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#c4b5fd', fontWeight: 800, fontSize: '0.86rem' }}>Evaluaciones lineales completadas</span>
          <Link href="/gestion/dashboard_riesgo_lineal" style={{ color: '#60a5fa', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none' }}>
            Ver todas →
          </Link>
        </div>
        {loading ? (
          <div style={{ padding: '1.5rem', color: '#64748b', fontSize: '0.8rem' }}>Cargando evaluaciones…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(71,85,105,0.35)' }}>
                  {['Código', 'Objetivo', 'Proceso / Alcance', 'Responsable', 'Estado', 'Avance', 'Actualización', 'Acción'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', color: '#93c5fd', fontSize: '0.68rem', padding: '0.55rem 0.75rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {completedEvals.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: '1.5rem 0.75rem', color: '#64748b', fontSize: '0.78rem' }}>
                      No hay evaluaciones lineales completadas.
                    </td>
                  </tr>
                )}
                {completedEvals.map((ev, idx) => {
                  const aBg = avatarBg(ev.initials);
                  return (
                    <tr key={ev.id} style={{ borderBottom: '1px solid rgba(30,41,59,0.65)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#60a5fa', fontWeight: 700, fontSize: '0.75rem' }}>{ev.code}</span>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', maxWidth: 220 }}>
                        <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.78rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                          {ev.title}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', maxWidth: 160, color: '#94a3b8', fontSize: '0.74rem' }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.scope || '—'}</span>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                        {ev.responsible ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: aBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>{ev.initials}</div>
                            <span style={{ color: '#cbd5e1', fontSize: '0.74rem' }}>{ev.responsible}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#475569', fontSize: '0.74rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: 6, background: `${ev.status_color}22`, border: `1px solid ${ev.status_color}55`, color: ev.status_color, fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                          {ev.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap', minWidth: 100 }}>
                        <div style={{ color: '#a78bfa', fontWeight: 700, fontSize: '0.75rem', marginBottom: '0.25rem' }}>{ev.progress}%</div>
                        <div style={{ height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.06)', width: 72 }}>
                          <div style={{ height: '100%', borderRadius: 999, background: '#a78bfa', width: `${ev.progress}%` }} />
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap', color: '#94a3b8', fontSize: '0.72rem' }}>
                        {ev.updated_at ? ev.updated_at.split(' ')[0] : '—'}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <Link
                            href={`/gestion/dashboard_riesgo_lineal`}
                            style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                            title="Ver evaluación"
                          >
                            <Eye size={13} />
                          </Link>
                          <button
                            onClick={() => void handleCreateFromLinear(ev.id)}
                            disabled={creatingFromLinear === ev.id}
                            style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: creatingFromLinear === ev.id ? 'wait' : 'pointer', opacity: creatingFromLinear === ev.id ? 0.5 : 1 }}
                            title="Crear grafo desde evaluación"
                          >
                            <Network size={13} />
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
      </section>

      <section style={{ ...CARD, padding: 0, overflow: 'hidden', marginTop: '0.85rem' }}>
        <div style={{ padding: '0.7rem 1rem', borderBottom: '1px solid rgba(71,85,105,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#67e8f9', fontWeight: 800, fontSize: '0.86rem' }}>Evaluaciones estructurales</span>
          <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600 }}>{structuralRuns.length} registro{structuralRuns.length !== 1 ? 's' : ''}</span>
        </div>
        {loadingStructural ? (
          <div style={{ padding: '1.5rem', color: '#64748b', fontSize: '0.8rem' }}>Cargando evaluaciones estructurales…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(71,85,105,0.35)' }}>
                  {['Código', 'Título', 'Alcance', 'Metodología', 'Estado', 'Versión', 'Fecha evaluación', 'Actualización', 'Acción'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', color: '#67e8f9', fontSize: '0.68rem', padding: '0.55rem 0.75rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {structuralRuns.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: '1.5rem 0.75rem', color: '#64748b', fontSize: '0.78rem' }}>
                      No hay evaluaciones estructurales registradas.
                    </td>
                  </tr>
                )}
                {structuralRuns.map((r, idx) => {
                  const lc = r.lifecycle_code;
                  const color = lifecycleColor(lc);
                  const label = r.lifecycle_name ?? lc ?? 'BORRADOR';
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(30,41,59,0.65)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#67e8f9', fontWeight: 700, fontSize: '0.75rem' }}>{r.code}</span>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', maxWidth: 220 }}>
                        <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.78rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                          {r.title}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', color: '#94a3b8', fontSize: '0.74rem', whiteSpace: 'nowrap' }}>{r.scope_type}</td>
                      <td style={{ padding: '0.65rem 0.75rem', color: '#94a3b8', fontSize: '0.72rem', maxWidth: 180 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.methodology}</span>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: 6, background: `${color}22`, border: `1px solid ${color}55`, color, fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                          {label}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', color: '#cbd5e1', fontSize: '0.78rem', textAlign: 'center' }}>v{r.version}</td>
                      <td style={{ padding: '0.65rem 0.75rem', color: '#94a3b8', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{r.assessment_date}</td>
                      <td style={{ padding: '0.65rem 0.75rem', color: '#94a3b8', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                        {r.updated_at ? String(r.updated_at).split('T')[0] || String(r.updated_at).split(' ')[0] : '—'}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <Link
                            href={`/gestion/wizard_captura_estructural?runSaId=${encodeURIComponent(r.id)}`}
                            style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                            title="Abrir evaluación"
                          >
                            <Play size={13} fill="currentColor" />
                          </Link>
                          {lc === 'COMPLETED' ? (
                            <Link
                              href={`/gestion/wizard_captura_estructural/analisis_estructural?runSaId=${encodeURIComponent(r.id)}`}
                              style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)', color: '#a78bfa', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                              title="Ver análisis estructural"
                            >
                              <Eye size={13} />
                            </Link>
                          ) : null}
                          <button
                            onClick={() => void handleDeleteStructural(r.id, r.code)}
                            disabled={deletingId === r.id}
                            title="Eliminar evaluación"
                            style={{
                              width: 28, height: 28, borderRadius: 7, cursor: deletingId === r.id ? 'wait' : 'pointer',
                              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.28)',
                              color: '#f87171', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              opacity: deletingId === r.id ? 0.5 : 1,
                            }}
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
      </section>
    </main>
  );
}

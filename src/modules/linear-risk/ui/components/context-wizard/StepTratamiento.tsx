'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Calendar, CheckCircle2, CheckSquare, ChevronDown, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { CARD, ErrorAlert, extractError, INPUT_S, LoaderSection } from './ContextWizardShared';
import type { TreatmentActionRow } from './StepValoracion';

type ValuationData = {
  meta: { run_ra_code: string; evaluated_process: string; risk_appetite: string };
  summary: { total_inherent: number; total_residual: number; total_reduction: number; total_reduction_percent: number };
  risks: Array<{
    id: string;
    code: string;
    risk: string;
    cause: string | null;
    activity: string | null;
    inherent_score: number;
    residual_score: number;
    residual_level: string | null;
    residual_level_color: string | null;
  }>;
  catalogs: { valoration: Array<{ id: string; decision: string }>; owners?: Array<{ id: string; name: string }> };
};

export function StepTratamiento({ runRaId }: { runRaId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ValuationData>({
    meta: { run_ra_code: '', evaluated_process: '', risk_appetite: '' },
    summary: { total_inherent: 0, total_residual: 0, total_reduction: 0, total_reduction_percent: 0 },
    risks: [],
    catalogs: { valoration: [], owners: [] },
  });
  const [search, setSearch] = useState('');
  const [selectedRiskId, setSelectedRiskId] = useState<string>('');
  const [actionsByRisk, setActionsByRisk] = useState<Record<string, TreatmentActionRow[]>>({});
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());
  const [addingAction, setAddingAction] = useState(false);
  const debounceTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const owners = data.catalogs?.owners ?? [];

  async function readJsonSafe<T>(res: Response): Promise<T | null> {
    const text = await res.text();
    if (!text.trim()) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }

  async function loadRisks() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/linear-risk/risk-valuation?runRaId=${encodeURIComponent(runRaId)}`, {
        credentials: 'include', cache: 'no-store',
      });
      const body = await res.json() as ValuationData & { error?: string };
      if (!res.ok) throw new Error(extractError(body, `HTTP ${res.status}`));
      setData(body);
      setSelectedRiskId((prev) => prev || body.risks[0]?.id || '');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar tratamiento.');
    } finally {
      setLoading(false);
    }
  }

  async function loadActions(riskId: string) {
    try {
      const res = await fetch(
        `/api/linear-risk/risk-treatment?runRaId=${encodeURIComponent(runRaId)}&riskId=${encodeURIComponent(riskId)}`,
        { credentials: 'include', cache: 'no-store' }
      );
      const body = await readJsonSafe<{ actions: Array<{ id: string; treatment_action: string; responsible_id: string | null; responsible_name: string | null; target_date: string | null; requires_reevaluation: boolean; status: string }>; error?: string }>(res);
      if (!body) return;
      if (!res.ok) return;
      const mapped: TreatmentActionRow[] = body.actions.map((a) => ({
        id: a.id,
        action: a.treatment_action,
        responsible_id: a.responsible_id ?? '',
        due_date: a.target_date ?? '',
        monitored: Boolean(a.requires_reevaluation),
        status: (['Pendiente', 'En curso', 'Completado'].includes(a.status) ? a.status : 'Pendiente') as TreatmentActionRow['status'],
      }));
      setActionsByRisk((prev) => ({ ...prev, [riskId]: mapped }));
    } catch { /* silently ignore */ }
  }

  useEffect(() => { void loadRisks(); }, [runRaId]);

  useEffect(() => {
    if (selectedRiskId && !(selectedRiskId in actionsByRisk)) {
      void loadActions(selectedRiskId);
    }
  }, [selectedRiskId]);

  function scheduleAutoSave(riskId: string, row: TreatmentActionRow) {
    if (row._tempId) return; // still waiting for server to assign real id
    if (debounceTimers.current[row.id]) clearTimeout(debounceTimers.current[row.id]);
    debounceTimers.current[row.id] = setTimeout(() => {
      void persistRow(riskId, row);
    }, 600);
  }

  async function persistRow(riskId: string, row: TreatmentActionRow) {
    setSavingRows((s) => new Set(s).add(row.id));
    try {
      await fetch('/api/linear-risk/risk-treatment', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: row.id,
          runRaId,
          riskId,
          action: row.action,
          responsible_id: row.responsible_id || null,
          due_date: row.due_date || null,
          monitored: row.monitored,
          status: row.status,
        }),
      });
    } finally {
      setSavingRows((s) => { const n = new Set(s); n.delete(row.id); return n; });
    }
  }

  function updateAction(riskId: string, actionId: string, patch: Partial<TreatmentActionRow>) {
    setActionsByRisk((prev) => {
      const updated = (prev[riskId] ?? []).map((a) => {
        if (a.id !== actionId) return a;
        const next = { ...a, ...patch };
        scheduleAutoSave(riskId, next);
        return next;
      });
      return { ...prev, [riskId]: updated };
    });
  }

  async function addAction(riskId: string) {
    setAddingAction(true);
    try {
      const res = await fetch('/api/linear-risk/risk-treatment', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runRaId, riskId, action: '', responsible_id: null, due_date: null, monitored: false, status: 'Pendiente' }),
      });
      const body = await readJsonSafe<{ ok: boolean; id: string; error?: string }>(res);
      if (!res.ok || !body?.id) throw new Error(extractError(body ?? {}, 'Error al crear acción'));
      const newRow: TreatmentActionRow = { id: body.id, action: '', responsible_id: '', due_date: '', monitored: false, status: 'Pendiente' };
      setActionsByRisk((prev) => ({ ...prev, [riskId]: [...(prev[riskId] ?? []), newRow] }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la acción.');
    } finally {
      setAddingAction(false);
    }
  }

  async function removeAction(riskId: string, actionId: string) {
    setActionsByRisk((prev) => ({ ...prev, [riskId]: (prev[riskId] ?? []).filter((a) => a.id !== actionId) }));
    if (debounceTimers.current[actionId]) { clearTimeout(debounceTimers.current[actionId]); delete debounceTimers.current[actionId]; }
    await fetch(`/api/linear-risk/risk-treatment?runRaId=${encodeURIComponent(runRaId)}&id=${encodeURIComponent(actionId)}`, {
      method: 'DELETE', credentials: 'include',
    });
  }

  const riskLevelBadge = (score: number) => {
    if (score >= 80) return { label: 'Muy Alto', color: '#ef4444', bg: 'rgba(239,68,68,0.18)' };
    if (score >= 60) return { label: 'Alto', color: '#f97316', bg: 'rgba(249,115,22,0.18)' };
    if (score >= 40) return { label: 'Medio', color: '#eab308', bg: 'rgba(234,179,8,0.18)' };
    return { label: 'Bajo', color: '#22c55e', bg: 'rgba(34,197,94,0.18)' };
  };

  const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  const avatarColors = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6'];
  const avatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

  const statusStyle = (s: TreatmentActionRow['status']): React.CSSProperties => {
    if (s === 'Completado') return { color: '#34d399', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)' };
    if (s === 'En curso')   return { color: '#fbbf24', background: 'rgba(251,191,36,0.12)',  border: '1px solid rgba(251,191,36,0.3)' };
    return { color: '#94a3b8', background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.25)' };
  };

  if (loading) return <LoaderSection />;

  const filteredRisks = data.risks.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.risk.toLowerCase().includes(q) || (r.cause || '').toLowerCase().includes(q) || (r.activity || '').toLowerCase().includes(q);
  });
  const selectedRisk = data.risks.find((r) => r.id === selectedRiskId) ?? filteredRisks[0] ?? data.risks[0];
  const currentActions = selectedRisk ? (actionsByRisk[selectedRisk.id] ?? []) : [];
  const isSaving = savingRows.size > 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.1rem', alignItems: 'start' }}>
      {error && <div style={{ gridColumn: '1/-1' }}><ErrorAlert message={error} /></div>}

      {/* ── Left panel ── */}
      <section style={{ ...CARD, padding: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
          <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '1rem', fontWeight: 800 }}>Riesgos seleccionados</h3>
          <span style={{ borderRadius: 8, background: 'rgba(99,102,241,0.28)', color: '#c4b5fd', padding: '0.18rem 0.55rem', fontWeight: 800, fontSize: '0.75rem' }}>{filteredRisks.length}</span>
        </div>
        <div style={{ position: 'relative', marginBottom: '0.8rem' }}>
          <span style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }}>🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar riesgo..." style={{ ...INPUT_S, padding: '10px 12px 10px 2rem' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '65vh', overflowY: 'auto', paddingRight: 2 }}>
          {filteredRisks.map((r) => {
            const b = riskLevelBadge(r.inherent_score);
            const active = selectedRisk?.id === r.id;
            return (
              <button key={r.id} onClick={() => setSelectedRiskId(r.id)} style={{ textAlign: 'left', borderRadius: 12, cursor: 'pointer', padding: '0.8rem 0.9rem', border: `1px solid ${active ? 'rgba(59,130,246,0.32)' : 'rgba(255,255,255,0.06)'}`, background: active ? 'rgba(59,130,246,0.12)' : 'rgba(15,23,42,0.42)', boxShadow: active ? '0 0 0 1px rgba(59,130,246,0.12)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.color, flexShrink: 0, display: 'inline-block', marginTop: 2 }} />
                    <span style={{ color: '#a78bfa', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '-0.01em' }}>{r.code || r.risk.slice(0, 12)}</span>
                  </div>
                  <span style={{ color: b.color, fontWeight: 900, fontSize: '1.15rem', lineHeight: 1, flexShrink: 0 }}>{r.inherent_score.toFixed(0)}</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.74rem', lineHeight: 1.4, marginLeft: '1.2rem', marginBottom: '0.45rem' }}>{r.risk}</div>
                <span style={{ marginLeft: '1.2rem', display: 'inline-block', borderRadius: 999, fontSize: '0.62rem', fontWeight: 700, color: b.color, background: b.bg, border: `1px solid ${b.color}55`, padding: '0.07rem 0.45rem' }}>{b.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Right panel ── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {/* Top info card */}
        <div style={{ ...CARD, border: '1px solid rgba(255,255,255,0.06)', padding: '1.1rem 1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' }}>
            <div>
              <p style={{ margin: 0, color: '#a78bfa', fontWeight: 900, fontSize: '1.55rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {selectedRisk?.code || (data.meta.run_ra_code ? `${data.meta.run_ra_code}-001` : 'Sin código')}
              </p>
              <p style={{ margin: '0.35rem 0 0', color: '#cbd5e1', fontSize: '0.95rem' }}>{selectedRisk?.risk || 'Seleccione un riesgo'}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {isSaving && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#60a5fa', fontSize: '0.72rem' }}>
                  <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...
                </span>
              )}
              {!isSaving && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#34d399', fontSize: '0.72rem' }}>
                  <CheckCircle2 size={12} /> Guardado
                </span>
              )}
              {selectedRisk && (() => {
                const b = riskLevelBadge(selectedRisk.inherent_score);
                const residualBadge = riskLevelBadge(selectedRisk.residual_score);
                return (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.2rem', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.15rem' }}>Riesgo Inherente</div>
                      <div style={{ color: b.color, fontSize: '2.2rem', fontWeight: 900, lineHeight: 1 }}>{selectedRisk.inherent_score.toFixed(0)}</div>
                      <span style={{ display: 'inline-block', marginTop: '0.3rem', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, color: b.color, background: b.bg, border: `1px solid ${b.color}55`, padding: '0.14rem 0.6rem' }}>{b.label}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.15rem' }}>Riesgo Residual</div>
                      <div style={{ color: '#22c55e', fontSize: '2.2rem', fontWeight: 900, lineHeight: 1 }}>{selectedRisk.residual_score.toFixed(0)}</div>
                      <span style={{ display: 'inline-block', marginTop: '0.3rem', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, color: residualBadge.color, background: residualBadge.bg, border: `1px solid ${residualBadge.color}55`, padding: '0.14rem 0.6rem' }}>
                        {residualBadge.label}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Actions table card */}
        <div style={{ ...CARD, border: '1px solid rgba(255,255,255,0.06)', padding: '1.1rem 1.2rem' }}>
          <h3 style={{ margin: '0 0 0.9rem 0', color: '#e2e8f0', fontSize: '1rem', fontWeight: 800 }}>Acciones del plan de tratamiento</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(71,85,105,0.3)' }}>
                  {['#', 'Acción', 'Responsable', 'Fecha objetivo', 'Monitoreo', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', color: '#64748b', fontSize: '0.7rem', fontWeight: 700, padding: '0.5rem 0.7rem', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentActions.map((row, idx) => {
                  const sStyle = statusStyle(row.status);
                  const riskId = selectedRisk!.id;
                  const ownerName = owners.find((o) => o.id === row.responsible_id)?.name ?? '';
                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid rgba(30,41,59,0.45)', opacity: savingRows.has(row.id) ? 0.7 : 1 }}>
                      <td style={{ padding: '0.6rem 0.7rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.82rem' }}>{idx + 1}</td>
                      <td style={{ padding: '0.6rem 0.7rem', minWidth: 220 }}>
                        <input
                          style={{ ...INPUT_S, fontSize: '0.82rem' }}
                          value={row.action}
                          onChange={(e) => updateAction(riskId, row.id, { action: e.target.value })}
                        />
                      </td>
                      <td style={{ padding: '0.6rem 0.7rem', minWidth: 180 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.68rem', color: '#fff', background: ownerName ? avatarColor(ownerName) : '#475569' }}>
                            {ownerName ? initials(ownerName) : '?'}
                          </span>
                          <select
                            style={{ ...INPUT_S, fontSize: '0.78rem', flex: 1 }}
                            value={row.responsible_id}
                            onChange={(e) => updateAction(riskId, row.id, { responsible_id: e.target.value })}
                          >
                            <option value="" style={{ background: '#ffffff', color: '#000000' }}>Seleccionar</option>
                            {owners.map((o) => <option key={o.id} value={o.id} style={{ background: '#ffffff', color: '#000000' }}>{o.name}</option>)}
                          </select>
                        </div>
                      </td>
                      <td style={{ padding: '0.6rem 0.7rem', minWidth: 148 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Calendar size={14} color="#475569" style={{ flexShrink: 0 }} />
                          <input
                            type="date"
                            style={{ ...INPUT_S, fontSize: '0.78rem', flex: 1 }}
                            value={row.due_date}
                            onChange={(e) => updateAction(riskId, row.id, { due_date: e.target.value })}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '0.6rem 0.7rem', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={row.monitored}
                          onChange={(e) => updateAction(riskId, row.id, { monitored: e.target.checked })}
                          style={{ width: 18, height: 18, accentColor: '#3b82f6', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '0.6rem 0.7rem', minWidth: 130 }}>
                        <select
                          style={{ ...INPUT_S, fontSize: '0.78rem', ...sStyle, fontWeight: 700 }}
                          value={row.status}
                          onChange={(e) => updateAction(riskId, row.id, { status: e.target.value as TreatmentActionRow['status'] })}
                        >
                          <option value="Pendiente" style={{ background: '#ffffff', color: '#000000' }}>Pendiente</option>
                          <option value="En curso" style={{ background: '#ffffff', color: '#000000' }}>En curso</option>
                          <option value="Completado" style={{ background: '#ffffff', color: '#000000' }}>Completado</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.6rem 0.7rem' }}>
                        <button
                          onClick={() => void removeAction(riskId, row.id)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(127,29,29,0.2)', color: '#fca5a5', width: 34, height: 34, cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {currentActions.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#475569', fontSize: '0.82rem' }}>
                      No hay acciones. Agrega una acción de tratamiento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => selectedRisk && void addAction(selectedRisk.id)}
            disabled={addingAction || !selectedRisk}
            style={{ marginTop: '0.9rem', width: '100%', borderRadius: 10, border: '1px solid rgba(139,92,246,0.4)', background: 'rgba(76,29,149,0.18)', color: '#c4b5fd', fontWeight: 700, padding: '0.75rem', cursor: addingAction ? 'wait' : 'pointer', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', opacity: addingAction ? 0.6 : 1 }}
          >
            {addingAction ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Agregando...</> : '+ Agregar acción'}
          </button>
        </div>
      </section>
    </div>
  );
}

// ─── Step placeholder ─────────────────────────────────────────────────────────



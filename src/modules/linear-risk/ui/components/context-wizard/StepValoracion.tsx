'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Bell, CheckCircle2, Eye, FileText, Flame, Info, ShieldCheck, ShieldPlus, TrendingUp, X } from 'lucide-react';
import { CARD, ErrorAlert, extractError, INPUT_S, LoaderSection } from './ContextWizardShared';
import { HeatMapModal } from './StepAnalisisControlHeatMap';

type ValuationRisk = {
  id: string;
  code: string;
  risk: string;
  cause: string | null;
  activity: string | null;
  inherent_score: number;
  inherent_level: string | null;
  inherent_level_color: string | null;
  controls: Array<{ id: string; name: string }>;
  reduction_score: number;
  reduction_percent: number;
  residual_score: number;
  residual_level: string | null;
  residual_level_color: string | null;
  weight: number;
  id_valoration: string | null;
};

type ValuationData = {
  meta: { run_ra_code: string; evaluated_process: string; risk_appetite: string; appetite_tolerance_min?: number | null; appetite_tolerance_max?: number | null };
  summary: { total_inherent: number; total_residual: number; total_reduction: number; total_reduction_percent: number };
  risks: ValuationRisk[];
  catalogs: { valoration: Array<{ id: string; decision?: string; label?: string }> };
};

export type TreatmentActionRow = {
  id: string;
  action: string;
  responsible_id: string;
  due_date: string;
  monitored: boolean;
  status: 'Pendiente' | 'En curso' | 'Completado';
  _tempId?: boolean;
};

export function StepValoracion({ runRaId }: { runRaId: string }) {
  const emptyData: ValuationData = {
    meta: { run_ra_code: '', evaluated_process: '', risk_appetite: '', appetite_tolerance_min: null, appetite_tolerance_max: null },
    summary: { total_inherent: 0, total_residual: 0, total_reduction: 0, total_reduction_percent: 0 },
    risks: [],
    catalogs: { valoration: [] },
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [data, setData] = useState<ValuationData>(emptyData);
  const [savingDecisionByRisk, setSavingDecisionByRisk] = useState<Record<string, boolean>>({});
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/linear-risk/risk-valuation?runRaId=${encodeURIComponent(runRaId)}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const body = await res.json() as ValuationData & { error?: string };
      if (!res.ok) throw new Error(extractError(body, `HTTP ${res.status}`));
      setData({
        ...emptyData,
        ...body,
        meta: {
          ...emptyData.meta,
          ...(body.meta ?? {}),
        },
        summary: {
          ...emptyData.summary,
          ...(body.summary ?? {}),
        },
        risks: Array.isArray(body.risks) ? body.risks : [],
        catalogs: {
          ...emptyData.catalogs,
          ...(body.catalogs ?? {}),
          valoration: Array.isArray(body.catalogs?.valoration) ? body.catalogs.valoration : [],
        },
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la valoración.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [runRaId]);

  async function handleChangeDecision(riskId: string, valorationId: string) {
    setAutoSaveState('saving');
    setSavingDecisionByRisk((s) => ({ ...s, [riskId]: true }));
    try {
      const res = await fetch('/api/linear-risk/risk-valuation', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runRaId, riskId, valorationId: valorationId || null }),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(extractError(body, `HTTP ${res.status}`));
      setData((prev) => ({
        ...prev,
        risks: prev.risks.map((r) => (r.id === riskId ? { ...r, id_valoration: valorationId || null } : r)),
      }));
      setAutoSaveState('saved');
      setTimeout(() => setAutoSaveState('idle'), 1200);
    } catch (e: unknown) {
      setAutoSaveState('error');
      setError(e instanceof Error ? e.message : 'No se pudo guardar la decisión.');
    } finally {
      setSavingDecisionByRisk((s) => ({ ...s, [riskId]: false }));
    }
  }

  if (loading) return <LoaderSection />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && <ErrorAlert message={error} />}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color:
              autoSaveState === 'saving'
                ? '#38bdf8'
                : autoSaveState === 'saved'
                  ? '#34d399'
                  : autoSaveState === 'error'
                    ? '#f87171'
                    : '#64748b',
          }}
        >
          {autoSaveState === 'saving'
            ? 'Autoguardado: guardando cambios...'
            : autoSaveState === 'saved'
              ? 'Autoguardado: cambios guardados'
              : autoSaveState === 'error'
                ? 'Autoguardado: error al guardar'
                : 'Autoguardado activo'}
        </span>
      </div>

      

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.6fr', gap: '0.85rem' }}>
        {[
          { label: 'Total riesgo inherente', value: data.summary.total_inherent.toFixed(2), hint: 'Suma de todos los riesgos inherentes', color: '#c4b5fd', icon: <AlertTriangle size={16} color="#c4b5fd" /> },
          { label: 'Riesgo residual total', value: data.summary.total_residual.toFixed(2), hint: 'Después de controles existentes', color: '#34d399', icon: <ShieldCheck size={16} color="#34d399" /> },
          { label: 'Reducción total', value: `${data.summary.total_reduction.toFixed(2)} (${data.summary.total_reduction_percent.toFixed(1)}%)`, hint: 'Reducción del riesgo inherente', color: '#38bdf8', icon: <Activity size={16} color="#38bdf8" /> },
        ].map((card) => (
          <div key={card.label} style={{ ...CARD, padding: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.55rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '0.55rem', textAlign: 'center' }}>
              {card.icon}<span>{card.label.toUpperCase()}</span>
            </div>
            <div style={{ color: card.color, fontSize: '2.1rem', fontWeight: 900, lineHeight: 1 }}>{card.value}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '0.45rem' }}>{card.hint}</div>
          </div>
        ))}
        <div style={{ ...CARD, padding: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ color: '#c4b5fd', fontWeight: 800, marginBottom: '0.7rem', textAlign: 'center' }}>DECISIONES DISPONIBLES</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(70px, 1fr))', gap: '0.5rem' }}>
            {[
              { label: 'Aceptar', icon: <CheckCircle2 size={18} color="#34d399" /> },
              { label: 'Tratar', icon: <ShieldPlus size={18} color="#60a5fa" /> },
              { label: 'Escalar', icon: <TrendingUp size={18} color="#f59e0b" /> },
              { label: 'Modificar la actividad', icon: <FileText size={18} color="#fbbf24" /> },
              { label: 'Detener actividad', icon: <X size={18} color="#ef4444" /> },
              { label: 'Monitorear', icon: <Bell size={18} color="#a78bfa" /> },
            ].map((d) => (
              <div key={d.label} style={{ border: '1px solid rgba(148,163,184,0.25)', borderRadius: 10, padding: '0.55rem 0.35rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.35rem', minHeight: 84 }}>
                {d.icon}
                <span style={{ color: '#e2e8f0', fontSize: '0.66rem', fontWeight: 600 }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ ...CARD, padding: 0, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1400 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.4)' }}>
                {['Riesgo', 'Actividad', 'Riesgo inherente', 'Controles existentes', 'Reducción por controles', 'Riesgo residual', 'Apetito', 'Acciones'].map((h) => (
                  <th key={h} style={{ textAlign: 'center', padding: '0.68rem 0.62rem', color: '#a5b4fc', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.risks.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '1rem', color: '#64748b' }}>Sin riesgos para valorar.</td></tr>
              )}
              {data.risks.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(71,85,105,0.22)' }}>
                  <td style={{ padding: '0.62rem 0.62rem', verticalAlign: 'middle' }}>
                    <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: '0.94rem', lineHeight: 1.1 }}>
                      {r.risk}
                    </div>
                  </td>
                  <td style={{ padding: '0.62rem 0.62rem', color: '#cbd5e1', maxWidth: 220, fontSize: '0.65rem', verticalAlign: 'middle' }}>{r.activity || '-'}</td>
                  <td style={{ padding: '0.62rem 0.62rem', textAlign: 'center' }}>
                    <div style={{ color: '#f87171', fontSize: '0.98rem', fontWeight: 900, lineHeight: 1 }}>{r.inherent_score.toFixed(2)}</div>
                    <span style={{ fontSize: '0.6rem', color: '#fca5a5' }}>{r.inherent_level || '-'}</span>
                  </td>
                  <td style={{ padding: '0.62rem 0.62rem', maxWidth: 280, textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.28rem', alignItems: 'center' }}>
                      {r.controls.slice(0, 3).map((c) => (
                        <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#cbd5e1', fontSize: '0.62rem' }}>
                          <CheckCircle2 size={12} color="#34d399" /> {c.name}
                        </span>
                      ))}
                      {r.controls.length === 0 && <span style={{ color: '#64748b', fontSize: '0.6rem' }}>Sin controles vinculados</span>}
                      <span style={{ color: '#60a5fa', fontSize: '0.6rem', fontWeight: 700, marginTop: 2 }}>Ver detalles</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.62rem 0.62rem', textAlign: 'center' }}>
                    <div style={{ color: '#34d399', fontSize: '0.98rem', fontWeight: 900, lineHeight: 1 }}>{r.reduction_score.toFixed(2)}</div>
                    <span style={{ color: '#6ee7b7', fontSize: '0.6rem', fontWeight: 700 }}>({r.reduction_percent.toFixed(1)}%)</span>
                  </td>
                  <td style={{ padding: '0.62rem 0.62rem', textAlign: 'center' }}>
                    <div style={{ color: '#fb7185', fontSize: '0.98rem', fontWeight: 900, lineHeight: 1 }}>{r.residual_score.toFixed(2)}</div>
                    <span style={{ marginTop: 3, display: 'inline-block', padding: '0.08rem 0.42rem', borderRadius: 999, fontSize: '0.56rem', fontWeight: 700, color: r.residual_level_color || '#fbbf24', border: `1px solid ${r.residual_level_color || '#fbbf24'}66`, background: `${r.residual_level_color || '#fbbf24'}22` }}>
                      {r.residual_level || 'Sin nivel'}
                    </span>
                  </td>
                  <td style={{ padding: '0.62rem 0.62rem', color: '#e2e8f0', fontWeight: 700, fontSize: '0.64rem', textAlign: 'center' }}>
                    {data.meta.appetite_tolerance_min != null || data.meta.appetite_tolerance_max != null
                      ? `${data.meta.appetite_tolerance_min ?? '-'}% - ${data.meta.appetite_tolerance_max ?? '-'}%`
                      : 'No definido'}
                  </td>
                  <td style={{ padding: '0.62rem 0.62rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <select
                        value={r.id_valoration || ''}
                        onChange={(e) => void handleChangeDecision(r.id, e.target.value)}
                        disabled={Boolean(savingDecisionByRisk[r.id])}
                        style={{
                          ...INPUT_S,
                          width: 118,
                          minWidth: 118,
                          padding: '0.36rem 0.45rem',
                          fontSize: '0.62rem',
                          borderRadius: 9,
                          border: '1px solid rgba(56,189,248,0.45)',
                          background: 'rgba(2,16,42,0.78)',
                          color: '#e2e8f0',
                        }}
                      >
                        <option value="">Decisión</option>
                        {(data.catalogs?.valoration ?? []).map((opt) => (
                          <option key={opt.id} value={opt.id} style={{ background: '#ffffff', color: '#000000' }}>{opt.label || opt.decision}</option>
                        ))}
                      </select>
                      <button type="button" title="Ver detalle del riesgo" style={{ borderRadius: 9, border: '1px solid rgba(59,130,246,0.45)', background: 'rgba(37,99,235,0.16)', color: '#93c5fd', width: 28, height: 28, cursor: 'pointer' }}>
                      <Eye size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ ...CARD, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#cbd5e1', fontSize: '0.82rem' }}>
          <Info size={18} color="#a78bfa" />
          <span>La decisión seleccionada determinará las acciones a seguir y el tratamiento que se le dará a cada riesgo identificado.</span>
        </div>
        <div style={{ display: 'flex', gap: '0.7rem' }}>
          
          <button
            type="button"
            onClick={() => setShowHeatMap(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', borderRadius: 11, border: '1px solid rgba(249,115,22,0.4)', background: 'rgba(249,115,22,0.1)', color: '#fb923c', padding: '0.65rem 1.5rem', fontWeight: 700, cursor: 'pointer' }}
          >
            <Flame size={15} /> Mapa de calor
          </button>
          
        </div>
      </section>
      {showHeatMap && (
        <HeatMapModal runRaId={runRaId} onClose={() => setShowHeatMap(false)} />
      )}
    </div>
  );
}




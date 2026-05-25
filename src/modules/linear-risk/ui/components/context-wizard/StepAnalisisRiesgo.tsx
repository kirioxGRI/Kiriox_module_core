'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, ClipboardList, Plus, X } from 'lucide-react';
import { CARD, ErrorAlert, extractError, INPUT_S, LoaderSection, SECTION_HDR } from './ContextWizardShared';
import { AiFieldAssist } from '@/shared/ai';
import type { AiFieldContract } from '@/shared/ai';

const DESCRIPCION_RIESGO_CONTRACT: AiFieldContract = {
  module: 'linear-risk',
  field: 'description',
  intent: 'complete',
  minWords: 10,
  maxWords: 25,
  tone: 'tecnico',
  output: 'text',
  requiredMeaning: ['riesgo', 'impacto'],
};

type AnalysisItem = {
  id: string;
  name: string;
  description: string | null;
  risk_category: string | null;
  risk_category_id: string | null;
  cause: string;
  event: string;
  consequence: string;
  objective_id: string | null;
  affected_objective: string;
  activity_id: string;
  owner_id: string;
  impact_score: number | null;
  probability_score: number | null;
  inherent_risk_score: number | null;
  peso_id?: string;
  peso_value?: number | null;
  control_ids: string[];
};
type AnalysisMeta = {
  run_ra_id: string;
  run_ra_code: string;
  evaluated_process: string;
  evaluated_activity: string;
  responsible_person: string;
  risk_appetite: string;
  appetite_tolerance_min: number | null;
  appetite_tolerance_max: number | null;
};
type AnalysisCatalogs = {
  impacts: Array<{ id: string; name: string; description: string | null; ordinal: number | null; numeric_value: number }>;
  probabilities: Array<{ id: string; name: string; description: string | null; ordinal: number | null; numeric_value: number }>;
  pesos: Array<{ id: string; descripcion: string; peso: number }>;
  activities: Array<{ id: string; name: string }>;
  owners: Array<{ id: string; name: string }>;
  controls: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  objectives: Array<{ id: string; name: string }>;
};
type AnalysisForm = {
  id?: string;
  name: string;
  description: string;
  risk_category: string;
  cause: string;
  event: string;
  consequence: string;
  objective_id: string;
  activity_id: string;
  impact_id: string;
  probability_id: string;
  peso_id: string;
  control_ids: string[];
};

const ANALYSIS_EMPTY: AnalysisForm = {
  name: '',
  description: '',
  risk_category: '',
  cause: '',
  event: '',
  consequence: '',
  objective_id: '',
  activity_id: '',
  impact_id: '',
  probability_id: '',
  peso_id: '',
  control_ids: [],
};

function objectiveBadgeColor(text: string) {
  const v = (text || '').toLowerCase();
  if (v.includes('oper')) return { bg: 'rgba(14,165,233,0.16)', bd: 'rgba(14,165,233,0.4)', tx: '#38bdf8' };
  if (v.includes('info')) return { bg: 'rgba(16,185,129,0.16)', bd: 'rgba(16,185,129,0.4)', tx: '#34d399' };
  if (v.includes('cumpl')) return { bg: 'rgba(168,85,247,0.16)', bd: 'rgba(168,85,247,0.4)', tx: '#c084fc' };
  return { bg: 'rgba(100,116,139,0.16)', bd: 'rgba(100,116,139,0.35)', tx: '#94a3b8' };
}

function scoreBadge(score: number | null, type: 'impact' | 'probability') {
  if (score == null) return { label: '-', color: '#64748b' };
  if (type === 'impact') {
    if (score >= 4) return { label: 'Alto', color: '#ef4444' };
    if (score >= 3) return { label: 'Medio', color: '#f59e0b' };
    return { label: 'Bajo', color: '#10b981' };
  }
  if (score >= 4) return { label: 'Alta', color: '#ef4444' };
  if (score >= 3) return { label: 'Media', color: '#f59e0b' };
  return { label: 'Baja', color: '#10b981' };
}

export function StepAnalisisRiesgo({ runRaId }: { runRaId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AnalysisItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const formCardRef = useRef<HTMLDivElement | null>(null);
  const [meta, setMeta] = useState<AnalysisMeta>({
    run_ra_id: runRaId,
    run_ra_code: '',
    evaluated_process: '',
    responsible_person: '',
    evaluated_activity: '',
    risk_appetite: '',
    appetite_tolerance_min: null,
    appetite_tolerance_max: null,
  });
  const [catalogs, setCatalogs] = useState<AnalysisCatalogs>({
    impacts: [],
    probabilities: [],
    pesos: [],
    activities: [],
    owners: [],
    controls: [],
    categories: [],
    objectives: [],
  });
  const [form, setForm] = useState<AnalysisForm>(ANALYSIS_EMPTY);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/linear-risk/analysis-risks?runRaId=${encodeURIComponent(runRaId)}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json() as { items: AnalysisItem[]; catalogs: AnalysisCatalogs; meta?: AnalysisMeta; error?: string };
      if (res.status === 401) throw new Error('Sesión expirada. Inicie sesión nuevamente.');
      if (!res.ok) throw new Error(extractError(data, `HTTP ${res.status}`));
      setItems(data.items ?? []);
      setCatalogs(data.catalogs ?? { impacts: [], probabilities: [], pesos: [], activities: [], owners: [], controls: [], categories: [], objectives: [] });
      setMeta(data.meta ?? {
        run_ra_id: runRaId,
        run_ra_code: '',
        evaluated_process: '',
        responsible_person: '',
        evaluated_activity: '',
        risk_appetite: '',
        appetite_tolerance_min: null,
        appetite_tolerance_max: null,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el paso de análisis.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [runRaId]);

  useEffect(() => {
    if (catalogs.activities.length > 0 && meta.evaluated_activity) {
      const byName = catalogs.activities.find((a) => a.name === meta.evaluated_activity);
      if (byName) setForm((f) => ({ ...f, activity_id: byName.id }));
    }
  }, [catalogs.activities]);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      impact_id: f.id ? f.impact_id : (f.impact_id || catalogs.impacts[0]?.id || ''),
      probability_id: f.id ? f.probability_id : (f.probability_id || catalogs.probabilities[0]?.id || ''),
      peso_id: f.id ? f.peso_id : (f.peso_id || catalogs.pesos[0]?.id || ''),
    }));
  }, [catalogs.impacts, catalogs.probabilities, catalogs.pesos]);

  function openNew() {
    setForm(ANALYSIS_EMPTY);
    setError(null);
    setShowForm(true);
    setTimeout(() => formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function closeForm() {
    setShowForm(false);
    setForm(ANALYSIS_EMPTY);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const derivedName = form.name?.trim() || form.event?.trim() || form.cause?.trim() || 'Riesgo sin título';
      const derivedDescription = form.description?.trim() || `${form.cause || ''} ${form.event || ''}`.trim() || 'Sin descripción';
      const res = await fetch('/api/linear-risk/analysis-risks', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runRaId, ...form, name: derivedName, description: derivedDescription }),
      });
      const data = await res.json() as { error?: string };
      if (res.status === 401) throw new Error('Sesión expirada. Inicie sesión nuevamente.');
      if (!res.ok) throw new Error(extractError(data, `HTTP ${res.status}`));
      setShowForm(false);
      setForm(ANALYSIS_EMPTY);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el riesgo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      const res = await fetch(`/api/linear-risk/analysis-risks?runRaId=${encodeURIComponent(runRaId)}&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json() as { error?: string };
      if (res.status === 401) throw new Error('Sesión expirada. Inicie sesión nuevamente.');
      if (!res.ok) throw new Error(extractError(data, `HTTP ${res.status}`));
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo remover.');
    }
  }

  function handleEdit(item: AnalysisItem) {
    const impactMatch = catalogs.impacts.find((i) => Number(i.numeric_value) === Number(item.impact_score ?? NaN));
    const probabilityMatch = catalogs.probabilities.find((p) => Number(p.numeric_value) === Number(item.probability_score ?? NaN));
    setForm({
      id: item.id,
      name: item.name ?? '',
      description: item.description ?? '',
      risk_category: item.risk_category_id ?? '',
      cause: item.cause ?? '',
      event: item.event ?? '',
      consequence: item.consequence ?? '',
      objective_id: item.objective_id ?? '',
      activity_id: item.activity_id ?? '',
      impact_id: impactMatch?.id ?? '',
      probability_id: probabilityMatch?.id ?? '',
      peso_id: item.peso_id ?? '',
      control_ids: item.control_ids ?? [],
    });
    setError(null);
    setShowForm(true);
    setTimeout(() => formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  if (loading) return <LoaderSection />;

  const impactOptions = [...catalogs.impacts].sort((a, b) => Number(a.numeric_value) - Number(b.numeric_value));
  const probabilityOptions = [...catalogs.probabilities].sort((a, b) => Number(a.numeric_value) - Number(b.numeric_value));
  const pesoOptions = [...catalogs.pesos].sort((a, b) => Number(a.peso) - Number(b.peso));
  const appetiteLabel = meta.risk_appetite
    ? String(meta.risk_appetite).replaceAll('_', ' ').toUpperCase()
    : 'No definido';

  const pesoIndex = Math.max(0, pesoOptions.findIndex((x) => x.id === form.peso_id));
  const pesoCurrent = pesoOptions[pesoIndex];
  const pesoNumeric = Number(pesoCurrent?.peso ?? 0);

  const setPesoByPosition = (position: number) => {
    const idx = Math.max(0, Math.min(pesoOptions.length - 1, position - 1));
    const match = pesoOptions[idx];
    if (match) setForm((f) => ({ ...f, peso_id: match.id }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>

      {/* Formulario — se muestra/oculta */}
      {showForm && (
        <div ref={formCardRef} style={{ ...CARD, border: '1px solid rgba(129,140,248,0.28)', width: '100%', padding: '1.2rem' }}>
          {/* Cabecera del formulario */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
            <div>
              <p style={{ ...SECTION_HDR, color: '#7dd3fc', marginBottom: '0.2rem', fontSize: '1.05rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                <BarChart3 size={16} /> {form.id ? 'Editar riesgo' : 'Nuevo riesgo'}
              </p>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.74rem' }}>
                Complete los campos y guarde para agregar al listado.
              </p>
            </div>
            <button
              type="button"
              onClick={closeForm}
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)', color: '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Descripción + IA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              style={{ ...INPUT_S, fontSize: '0.74rem', flex: '0 0 72%' }}
              placeholder="Descripción del riesgo"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <AiFieldAssist
              contract={DESCRIPCION_RIESGO_CONTRACT}
              currentValue={form.description || form.name}
              onAccept={(value) => setForm((f) => ({ ...f, description: value }))}
            />
          </div>

          {error && <ErrorAlert message={error} />}

          {/* Grid de campos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '0.8rem', alignItems: 'stretch' }}>
            {/* Columna izquierda */}
            <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '0.8rem', background: 'rgba(15,23,42,0.42)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                <input
                  style={{ ...INPUT_S, fontSize: '0.72rem', gridColumn: '1 / span 2' }}
                  placeholder="Nombre del riesgo"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
                <input style={{ ...INPUT_S, fontSize: '0.72rem' }} placeholder="Causa" value={form.cause} onChange={(e) => setForm((f) => ({ ...f, cause: e.target.value }))} />
                <input style={{ ...INPUT_S, fontSize: '0.72rem' }} placeholder="Evento" value={form.event} onChange={(e) => setForm((f) => ({ ...f, event: e.target.value }))} />
                <input style={{ ...INPUT_S, fontSize: '0.72rem' }} placeholder="Consecuencia" value={form.consequence} onChange={(e) => setForm((f) => ({ ...f, consequence: e.target.value }))} />
                <select style={{ ...INPUT_S, fontSize: '0.72rem' }} value={form.objective_id} onChange={(e) => setForm((f) => ({ ...f, objective_id: e.target.value }))}>
                  <option value="">Objetivo afectado</option>
                  {catalogs.objectives.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <select style={{ ...INPUT_S, fontSize: '0.72rem', gridColumn: '1 / span 2' }} value={form.risk_category} onChange={(e) => setForm((f) => ({ ...f, risk_category: e.target.value }))}>
                  <option value="">Categoría</option>
                  {catalogs.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* Columna derecha — Evaluación */}
            <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '0.8rem', background: 'rgba(15,23,42,0.42)' }}>
              <p style={{ margin: '0 0 0.6rem 0', color: '#e2e8f0', fontWeight: 700 }}>Evaluación del riesgo</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.6rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.45rem', alignItems: 'center', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10, padding: '0.4rem 0.5rem' }}>
                  <span style={{ color: '#e2e8f0', fontSize: '0.75rem', fontWeight: 700 }}>Impacto</span>
                  <select style={{ ...INPUT_S, fontSize: '0.72rem', padding: '0.45rem 12px' }} value={form.impact_id} onChange={(e) => setForm((f) => ({ ...f, impact_id: e.target.value }))}>
                    <option value="">Seleccione impacto</option>
                    {impactOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>{`${opt.name} | ${opt.description ?? '-'} | ${opt.ordinal ?? '-'}`}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.45rem', alignItems: 'center', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10, padding: '0.4rem 0.5rem' }}>
                  <span style={{ color: '#e2e8f0', fontSize: '0.75rem', fontWeight: 700 }}>Probabilidad</span>
                  <select style={{ ...INPUT_S, fontSize: '0.72rem', padding: '0.45rem 12px' }} value={form.probability_id} onChange={(e) => setForm((f) => ({ ...f, probability_id: e.target.value }))}>
                    <option value="">Seleccione probabilidad</option>
                    {probabilityOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>{`${opt.name} | ${opt.description ?? '-'} | ${opt.ordinal ?? '-'}`}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
                  <span style={{ color: '#e2e8f0', fontSize: '0.74rem', fontWeight: 700 }}>Peso del riesgo</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'rgba(59,130,246,0.18)', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(59,130,246,0.28)' }}>
                    {[1, 2, 3, 4].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setPesoByPosition(v)}
                        style={{
                          border: 'none',
                          background: pesoNumeric === v ? 'linear-gradient(95deg,#7c3aed,#6366f1)' : 'rgba(15,23,42,0.7)',
                          color: pesoNumeric === v ? '#fff' : '#cbd5e1',
                          padding: '0.42rem 0.2rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botón guardar */}
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            style={{
              marginTop: '0.9rem',
              width: '100%',
              borderRadius: 14,
              border: '1px solid rgba(129,140,248,0.42)',
              background: 'linear-gradient(95deg, #6d28d9, #2563eb)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: saving ? 'wait' : 'pointer',
              padding: '0.95rem 1rem',
            }}
          >
            {saving ? 'Guardando...' : form.id ? 'Guardar cambios' : 'Agregar al listado'}
          </button>
        </div>
      )}

      {/* Botón agregar — ancho completo, encima de la tarjeta */}
      {!showForm && (
        <button
          type="button"
          onClick={openNew}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '0.85rem 1rem', borderRadius: 12,
            background: 'linear-gradient(95deg, #6d28d9, #2563eb)',
            border: '1px solid rgba(129,140,248,0.35)',
            color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Agregar al listado
        </button>
      )}

      {/* Tabla de riesgos registrados */}
      <div style={{ ...CARD, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.18)', padding: '1rem', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.8rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ ...SECTION_HDR, color: '#c4b5fd', marginBottom: '0.3rem', fontSize: '0.92rem' }}>
              <ClipboardList size={14} /> Riesgos registrados
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.4rem' }}>
              <span style={{ fontSize: '0.68rem', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.35)', borderRadius: 999, padding: '0.18rem 0.58rem', background: 'rgba(37,99,235,0.10)', fontWeight: 700 }}>
                Actividad: {meta.evaluated_activity || 'No definida'}
              </span>
              <span style={{ fontSize: '0.68rem', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 999, padding: '0.18rem 0.58rem', background: 'rgba(124,58,237,0.10)', fontWeight: 700 }}>
                Responsable: {meta.responsible_person || 'No definido'}
              </span>
              <span style={{ fontSize: '0.68rem', color: '#34d399', border: '1px solid rgba(52,211,153,0.35)', borderRadius: 999, padding: '0.18rem 0.58rem', background: 'rgba(16,185,129,0.10)', fontWeight: 700 }}>
                Apetito: {appetiteLabel}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {/* Donut apetito de riesgo */}
            {(() => {
              const totalInherente = items.reduce((acc, it) => acc + Number(it.inherent_risk_score ?? 0), 0);
              const toleranceMax = meta.appetite_tolerance_max ?? 200;
              const ringFillPct = Math.max(0, Math.min(100, (totalInherente / toleranceMax) * 100));
              const ringAngle = Math.max(0, Math.min(360, Math.round((ringFillPct / 100) * 360)));
              return (
                <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '0.8rem 0.9rem', background: 'rgba(15,23,42,0.42)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div>
                    <div style={{ color: '#fb7185', fontSize: '1.5rem', fontWeight: 900, lineHeight: 1 }}>{appetiteLabel}</div>
                    <div style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 800, marginTop: 6 }}>APETITO DE RIESGO</div>
                    {(meta.appetite_tolerance_min != null || meta.appetite_tolerance_max != null) && (
                      <div style={{ color: '#93c5fd', fontSize: '0.72rem', fontWeight: 700, marginTop: 4 }}>
                        {meta.appetite_tolerance_min ?? '-'}% - {meta.appetite_tolerance_max ?? '-'}%
                      </div>
                    )}
                  </div>
                  <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: `conic-gradient(#fb7185 ${ringAngle}deg, rgba(148,163,184,0.22) 0deg)`, padding: 7, boxSizing: 'border-box' }}>
                      <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(9,18,45,0.98)', border: '1px solid rgba(148,163,184,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                        <div style={{ color: '#c4b5fd', fontSize: '1.3rem', fontWeight: 900, lineHeight: 1 }}>{Number(totalInherente.toFixed(1))}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.42rem', fontWeight: 700, textAlign: 'center', letterSpacing: '0.04em' }}>INHERENTE</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>

        {error && !showForm && <ErrorAlert message={error} />}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', color: '#cbd5e1' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(196,181,253,0.25)' }}>
                {['Nombre', 'Categoría', 'Causa', 'Evento', 'Consecuencia', 'Objetivo afectado', 'Actividad', 'Propietario', 'Impacto', 'Probabilidad', 'Peso', 'Inherente', 'Acciones'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.55rem 0.45rem', color: '#a5b4fc', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={13} style={{ padding: '2rem 0.8rem', color: '#64748b', textAlign: 'center' }}>Sin riesgos registrados. Presiona "Agregar al listado" para comenzar.</td></tr>
              )}
              {items.map((it) => (
                <tr key={it.id} style={{ borderBottom: '1px solid rgba(148,163,184,0.12)' }}>
                  <td style={{ padding: '0.5rem 0.45rem', fontWeight: 700, color: '#e2e8f0', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={it.name}>{it.name || '-'}</td>
                  <td style={{ padding: '0.5rem 0.45rem' }}>
                    {it.risk_category
                      ? <span style={{ background: 'rgba(100,116,139,0.18)', border: '1px solid rgba(100,116,139,0.35)', color: '#94a3b8', borderRadius: 999, padding: '0.12rem 0.45rem', fontSize: '0.68rem' }}>{it.risk_category}</span>
                      : <span style={{ color: '#475569' }}>—</span>}
                  </td>
                  <td style={{ padding: '0.5rem 0.45rem' }}>{it.cause}</td>
                  <td style={{ padding: '0.5rem 0.45rem' }}>{it.event}</td>
                  <td style={{ padding: '0.5rem 0.45rem' }}>{it.consequence}</td>
                  <td style={{ padding: '0.5rem 0.45rem' }}>
                    {(() => {
                      const c = objectiveBadgeColor(it.affected_objective || '');
                      return <span style={{ background: c.bg, border: `1px solid ${c.bd}`, color: c.tx, borderRadius: 999, padding: '0.14rem 0.48rem', fontSize: '0.68rem' }}>{it.affected_objective || '-'}</span>;
                    })()}
                  </td>
                  <td style={{ padding: '0.5rem 0.45rem' }}>{catalogs.activities.find((a) => a.id === it.activity_id)?.name || '-'}</td>
                  <td style={{ padding: '0.5rem 0.45rem' }}>{catalogs.owners.find((o) => o.id === it.owner_id)?.name || meta.responsible_person || '-'}</td>
                  <td style={{ padding: '0.5rem 0.45rem' }}>
                    {(() => {
                      const b = scoreBadge(it.impact_score, 'impact');
                      return <span style={{ color: b.color, display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: b.color, display: 'inline-block' }} />{b.label} ({it.impact_score ?? '-'})</span>;
                    })()}
                  </td>
                  <td style={{ padding: '0.5rem 0.45rem' }}>
                    {(() => {
                      const b = scoreBadge(it.probability_score, 'probability');
                      return <span style={{ color: b.color, display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: b.color, display: 'inline-block' }} />{b.label} ({it.probability_score ?? '-'})</span>;
                    })()}
                  </td>
                  <td style={{ padding: '0.5rem 0.45rem' }}>{it.peso_value ?? '-'}</td>
                  <td style={{ padding: '0.5rem 0.45rem', color: '#93c5fd', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {it.inherent_risk_score ?? '-'}
                  </td>
                  <td style={{ padding: '0.5rem 0.45rem', whiteSpace: 'nowrap' }}>
                    <button type="button" onClick={() => handleEdit(it)} style={{ marginRight: 6, borderRadius: 8, border: '1px solid rgba(59,130,246,0.35)', background: 'rgba(37,99,235,0.15)', color: '#93c5fd', padding: '0.22rem 0.5rem', fontSize: '0.68rem', cursor: 'pointer' }}>✎</button>
                    <button type="button" onClick={() => void handleRemove(it.id)} style={{ borderRadius: 8, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(185,28,28,0.16)', color: '#fca5a5', padding: '0.22rem 0.5rem', fontSize: '0.68rem', cursor: 'pointer' }}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

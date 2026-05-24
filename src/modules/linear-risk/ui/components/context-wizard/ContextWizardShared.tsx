'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  Info,
  Loader2,
  Save,
  Scale,
  ShieldCheck,
  ShieldPlus,
  Copy,
  Target,
  X,
} from 'lucide-react';
import { AiFieldAssist } from '@/shared/ai';
import type { AiFieldContract } from '@/shared/ai';

const OBJETIVO_CONTRACT: AiFieldContract = {
  module: 'linear-risk',
  field: 'objetivo',
  intent: 'complete',
  minWords: 10,
  maxWords: 50,
  tone: 'tecnico',
  output: 'text',
  requiredMeaning: ['evaluación', 'riesgo'],
};

const RECURSOS_CONTRACT: AiFieldContract = {
  module: 'linear-risk',
  field: 'recursos',
  intent: 'complete',
  minWords: 10,
  maxWords: 50,
  tone: 'tecnico',
  output: 'text',
  requiredMeaning: ['recursos', 'capacidad operativa'],
};

const CAPACIDADES_CONTRACT: AiFieldContract = {
  module: 'linear-risk',
  field: 'capacidades',
  intent: 'complete',
  minWords: 10,
  maxWords: 50,
  tone: 'tecnico',
  output: 'text',
  requiredMeaning: ['capacidades', 'competencias'],
};

export const RUN_RA_KEY = 'kiriox_active_run_ra_id';

export function extractError(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const d = data as Record<string, unknown>;
  if (typeof d.error === 'string') return d.error;
  if (d.error && typeof d.error === 'object') {
    const e = d.error as Record<string, unknown>;
    if (typeof e.message === 'string') return e.message;
  }
  return fallback;
}

export const STEPS = [
  { id: 1, key: 'contexto', label: 'Contexto', Icon: BriefcaseBusiness, desc: 'Base organizacional, alcance de la evaluación y criterios de riesgo.' },
  { id: 2, key: 'analisis-riesgo', label: 'Análisis riesgos', Icon: BarChart3, desc: '' },
  { id: 3, key: 'analisis-control', label: 'Análisis Ctrl', Icon: ShieldCheck, desc: 'Evalúa los controles mitigantes vinculados a cada riesgo identificado.' },
  { id: 4, key: 'valoracion', label: 'Valoración', Icon: Scale, desc: 'Valora cada riesgo frente a los criterios definidos y toma decisiones.' },
  { id: 5, key: 'tratamiento', label: 'Tratamiento', Icon: ShieldPlus, desc: 'Define las acciones de tratamiento para los riesgos inaceptables.' },
] as const;

export const APPETITE_OPTIONS = [
  { value: 'muy_bajo', label: 'Muy bajo', color: '#10b981' },
  { value: 'bajo', label: 'Bajo', color: '#34d399' },
  { value: 'medio', label: 'Medio', color: '#3b82f6' },
  { value: 'moderado', label: 'Moderado', color: '#3b82f6' },
  { value: 'alto', label: 'Alto', color: '#f59e0b' },
  { value: 'muy_alto', label: 'Muy alto', color: '#ef4444' },
] as const;

export const WIZARD_SURFACE_BG = 'rgba(0, 0, 0, 0.18)';
export const WIZARD_SURFACE_BORDER = '1px solid rgba(255,255,255,0.06)';
export const WIZARD_SURFACE_SHADOW = '0 10px 28px rgba(3,8,20,0.14)';

export const CARD: React.CSSProperties = {
  background: WIZARD_SURFACE_BG,
  border: WIZARD_SURFACE_BORDER,
  borderRadius: 16,
  padding: '1.5rem',
};

export const INPUT_S: React.CSSProperties = {
  width: '100%',
  background: 'rgba(15, 23, 42, 0.75)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 10,
  color: '#e7efff',
  fontSize: '0.88rem',
  padding: '10px 12px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

export const TEXTAREA_S: React.CSSProperties = {
  ...INPUT_S,
  resize: 'vertical',
  minHeight: 88,
};

export const LABEL_S: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 500,
  color: '#9babc4',
  display: 'block',
  marginBottom: 6,
};

export const SECTION_HDR: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 700,
  color: '#7b8fad',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  margin: '0 0 1rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.45rem',
};

type SaveButtonProps = {
  saving: boolean;
  saved: boolean;
  onClick: () => void;
  color?: string;
};

export function SaveButton({ saving, saved, onClick, color = '#3b82f6' }: SaveButtonProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.1rem' }}>
      <button
        onClick={onClick}
        disabled={saving}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.5rem 1.4rem',
          borderRadius: 10,
          background: saved ? 'rgba(16,185,129,0.15)' : `${color}22`,
          border: `1px solid ${saved ? 'rgba(16,185,129,0.4)' : `${color}88`}`,
          color: saved ? '#34d399' : color,
          fontSize: '0.82rem',
          fontWeight: 700,
          cursor: saving ? 'wait' : 'pointer',
        }}
      >
        {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
        {saving ? 'Guardando…' : saved ? 'Guardado' : 'Guardar'}
      </button>
    </div>
  );
}

export function LoaderSection() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.6rem', color: '#475569' }}>
      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: '0.82rem' }}>Cargando…</span>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.22)',
        borderRadius: 10,
        padding: '0.65rem 0.9rem',
        fontSize: '0.77rem',
        color: '#f87171',
      }}
    >
      <AlertCircle size={13} />
      {message}
    </div>
  );
}

export function SimpleInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label style={LABEL_S}>{label}</label>
      <input style={INPUT_S} value={value} onChange={onChange} />
    </div>
  );
}

export function SimpleTextarea({
  label,
  value,
  onChange,
  minHeight = 90,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  minHeight?: number;
}) {
  return (
    <div>
      <label style={LABEL_S}>{label}</label>
      <textarea style={{ ...TEXTAREA_S, minHeight }} value={value} onChange={onChange} />
    </div>
  );
}

export function SectionBlock({
  title,
  color,
  Icon,
  subtitle,
  badge,
  hideIcon,
  children,
}: {
  title: string;
  color: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  subtitle?: string;
  badge?: string;
  hideIcon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        borderRadius: 22,
        borderTop: WIZARD_SURFACE_BORDER,
        borderRight: WIZARD_SURFACE_BORDER,
        borderBottom: WIZARD_SURFACE_BORDER,
        borderLeft: `3px solid ${color}`,
        background: WIZARD_SURFACE_BG,
        padding: '1.15rem 1.4rem 1.2rem',
        boxShadow: WIZARD_SURFACE_SHADOW,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
          {hideIcon ? null : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${color}18`,
                border: `1px solid ${color}44`,
                boxShadow: `inset 0 0 0 1px ${color}12`,
              }}
            >
              <Icon size={18} color={color} />
            </div>
          )}
          <div>
            <h3 style={{ margin: 0, color: title.toLowerCase().includes('evaluación') ? '#f8fafc' : color, fontSize: '0.98rem', fontWeight: 800 }}>
              {title}
            </h3>
            {subtitle ? (
              <p style={{ margin: '0.18rem 0 0', color: '#97a8c4', fontSize: '0.76rem', lineHeight: 1.45 }}>
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {badge ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.42rem 0.75rem',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#9fb0cb',
              fontSize: '0.74rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            <Info size={13} />
            {badge}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

type EvalForm = {
  objetivo: string;
  alcance: string;
  objeto_evaluado: string;
  responsable: string;
  inclusiones: string;
  exclusiones: string;
  periodo_inicio: string;
  periodo_fin: string;
  metodologia: string;
  supuestos: string;
  fuentes: string;
  apetito: string;
  element_id: string;
  activity_id: string;
};

const EVAL_EMPTY: EvalForm = {
  objetivo: '',
  alcance: '',
  objeto_evaluado: '',
  responsable: '',
  inclusiones: '',
  exclusiones: '',
  periodo_inicio: '',
  periodo_fin: '',
  metodologia: '',
  supuestos: '',
  fuentes: '',
  apetito: '',
  element_id: '',
  activity_id: '',
};

export function EvaluacionTab({ runRaId }: { runRaId: string }) {
  const [form, setForm] = useState<EvalForm>(EVAL_EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appetiteCatalog, setAppetiteCatalog] = useState<Array<{ appetite_level: string; tolerance_min: number; tolerance_max: number }>>([]);
  const [elements, setElements] = useState<Array<{ id: string; name: string }>>([]);
  const [activities, setActivities] = useState<Array<{ id: string; name: string; element_id: string }>>([]);

  const filteredActivities = useMemo(() => {
    if (!form.element_id) return [];
    return activities.filter((activity) => activity.element_id === form.element_id);
  }, [activities, form.element_id]);

  useEffect(() => {
    fetch(`/api/linear-risk/general-context?runRaId=${encodeURIComponent(runRaId)}`)
      .then((r) => r.json())
      .then((d: {
        context: EvalForm | null;
        appetiteCatalog: Array<{ appetite_level: string; tolerance_min: number; tolerance_max: number }>;
        elements: Array<{ id: string; name: string }>;
        activities: Array<{ id: string; name: string; element_id: string }>;
      }) => {
        setElements(d.elements ?? []);
        setActivities(d.activities ?? []);
        setAppetiteCatalog(d.appetiteCatalog ?? []);

        const preProcessId = sessionStorage.getItem('KIRIOX_PRESELECTED_PROCESS_ID');
        const preActivityId = sessionStorage.getItem('KIRIOX_PRESELECTED_ACTIVITY_ID');

        const context = d.context ?? EVAL_EMPTY;
        setForm({
          objetivo: String(context.objetivo ?? ''),
          alcance: String(context.alcance ?? ''),
          objeto_evaluado: String(context.objeto_evaluado ?? ''),
          responsable: String(context.responsable ?? ''),
          inclusiones: String(context.inclusiones ?? ''),
          exclusiones: String(context.exclusiones ?? ''),
          periodo_inicio: String(context.periodo_inicio ?? ''),
          periodo_fin: String(context.periodo_fin ?? ''),
          metodologia: String(context.metodologia ?? ''),
          supuestos: String(context.supuestos ?? ''),
          fuentes: String(context.fuentes ?? ''),
          apetito: String(context.apetito ?? ''),
          element_id: String(context.element_id ?? preProcessId ?? ''),
          activity_id: String(context.activity_id ?? preActivityId ?? ''),
        });
      })
      .catch(() => setError('No se pudo cargar el contexto de evaluación.'))
      .finally(() => setLoading(false));
  }, [runRaId]);

  function set(key: keyof EvalForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/linear-risk/general-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, runRaId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { error?: { message?: string } }));
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoaderSection />;

  const maxChars = 2000;

  return (
    <div>
      {error && <ErrorAlert message={error} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '1rem', alignItems: 'start' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.9rem' }}>
          <div>
            <label style={LABEL_S}>Objetivo de la evaluación *</label>
            <div style={{ position: 'relative' }}>
              <textarea
                maxLength={maxChars}
                style={{ ...TEXTAREA_S, minHeight: 80, padding: '10px 12px 1.4rem' }}
                value={form.objetivo}
                onChange={set('objetivo')}
                placeholder="¿Qué busca determinar esta evaluación?..."
              />
              <span style={{ position: 'absolute', bottom: '0.4rem', right: '0.6rem', fontSize: '0.62rem', color: '#475569' }}>
                {form.objetivo.length}/{maxChars}
              </span>
            </div>
            <div style={{ marginTop: 6 }}>
              <AiFieldAssist
                contract={OBJETIVO_CONTRACT}
                currentValue={form.objetivo || form.objeto_evaluado}
                onAccept={(value) => setForm(f => ({ ...f, objetivo: value }))}
              />
            </div>
          </div>

          <div>
            <label style={LABEL_S}>Alcance *</label>
            <div style={{ position: 'relative' }}>
              <textarea
                maxLength={maxChars}
                style={{ ...TEXTAREA_S, minHeight: 80, padding: '10px 12px 1.4rem' }}
                value={form.alcance}
                onChange={set('alcance')}
                placeholder="¿Qué procesos, unidades y periodos cubre?..."
              />
              <span style={{ position: 'absolute', bottom: '0.4rem', right: '0.6rem', fontSize: '0.62rem', color: '#475569' }}>
                {form.alcance.length}/{maxChars}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 18,
            padding: '1rem 1rem 1.1rem',
            background: 'rgba(255,255,255,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.9rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Target size={13} color="#f59e0b" />
            <span style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 700 }}>Proceso evaluado</span>
          </div>

          <div>
            <label style={LABEL_S}>Proceso asociado</label>
            <select
              style={{ ...INPUT_S, appearance: 'auto' }}
              value={form.element_id}
              onChange={(e) => setForm((f) => ({ ...f, element_id: e.target.value, activity_id: '' }))}
            >
              <option value="">Seleccione un proceso...</option>
              {elements.map((element) => (
                <option key={element.id} value={element.id}>{element.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={LABEL_S}>Actividad específica</label>
            <select
              style={{ ...INPUT_S, appearance: 'auto' }}
              value={form.activity_id}
              onChange={(e) => setForm((f) => ({ ...f, activity_id: e.target.value }))}
              disabled={!form.element_id}
            >
              <option value="">{form.element_id ? 'Seleccione una actividad...' : 'Primero seleccione un proceso'}</option>
              {filteredActivities.map((activity) => (
                <option key={activity.id} value={activity.id}>{activity.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={LABEL_S}>Responsable de la evaluación</label>
            <input
              style={INPUT_S}
              value={form.responsable}
              onChange={set('responsable')}
              placeholder="Nombre o cargo..."
            />
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: '0.55rem',
          padding: '1.15rem 1.2rem',
          borderRadius: 18,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <label style={{ ...LABEL_S, marginBottom: 0, fontSize: '0.82rem', color: '#f8fafc' }}>Apetito general de riesgo</label>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', lineHeight: 1.4 }}>
            El apetito general de riesgo establece el nivel de exposición que la organización está dispuesta a asumir para alcanzar sus objetivos estratégicos en este proceso.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(appetiteCatalog.length > 0 ? appetiteCatalog : APPETITE_OPTIONS).map((option) => {
            const level = 'appetite_level' in option ? option.appetite_level : option.label;
            const value = 'appetite_level' in option ? option.appetite_level.toLowerCase().replace(/ /g, '_') : option.value;
            const min = 'tolerance_min' in option ? option.tolerance_min : null;
            const max = 'tolerance_max' in option ? option.tolerance_max : null;
            const base = APPETITE_OPTIONS.find((item) => item.value === value || item.label.toLowerCase() === level.toLowerCase());
            const color = base?.color || '#64748b';
            const active = form.apetito === value;

            return (
              <button
                key={value}
                onClick={() => setForm((f) => ({ ...f, apetito: f.apetito === value ? '' : value }))}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: 10,
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  background: active ? `${color}22` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${active ? `${color}88` : 'rgba(255,255,255,0.08)'}`,
                  color: active ? color : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.18rem',
                  minWidth: 90,
                }}
              >
                <span>{level}</span>
                {min !== null && max !== null ? (
                  <span style={{ fontSize: '0.6rem', opacity: 0.75, fontWeight: 500 }}>{min}% - {max}%</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <SaveButton saving={saving} saved={saved} onClick={handleSave} color="#f59e0b" />
    </div>
  );
}

type InternalForm = {
  recursos: string;
  capacidades: string;
  procesos: string;
  sistemas: string;
  personas_clave: string;
};

const INTERNAL_EMPTY: InternalForm = {
  recursos: '',
  capacidades: '',
  procesos: '',
  sistemas: '',
  personas_clave: '',
};

export function InternoTab({ runRaId }: { runRaId: string }) {
  const [form, setForm] = useState<InternalForm>(INTERNAL_EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/linear-risk/internal-external?runRaId=${encodeURIComponent(runRaId)}&type=INTERNO`)
      .then((r) => r.json())
      .then((d: { context?: InternalForm }) => setForm({ ...INTERNAL_EMPTY, ...(d.context ?? {}) }))
      .catch(() => setError('No se pudo cargar el contexto interno.'))
      .finally(() => setLoading(false));
  }, [runRaId]);

  function set(key: keyof InternalForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/linear-risk/internal-external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, runRaId, type: 'INTERNO' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoaderSection />;

  return (
    <div>
      {error && <ErrorAlert message={error} />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={LABEL_S}>Recursos</label>
          <textarea style={{ ...TEXTAREA_S, minHeight: 90 }} value={form.recursos} onChange={set('recursos')} />
          <div style={{ marginTop: 6 }}>
            <AiFieldAssist
              contract={RECURSOS_CONTRACT}
              currentValue={form.recursos}
              onAccept={(value) => setForm(f => ({ ...f, recursos: value }))}
            />
          </div>
        </div>
        <div>
          <label style={LABEL_S}>Capacidades</label>
          <textarea style={{ ...TEXTAREA_S, minHeight: 90 }} value={form.capacidades} onChange={set('capacidades')} />
          <div style={{ marginTop: 6 }}>
            <AiFieldAssist
              contract={CAPACIDADES_CONTRACT}
              currentValue={form.capacidades}
              onAccept={(value) => setForm(f => ({ ...f, capacidades: value }))}
            />
          </div>
        </div>
        <SimpleTextarea label="Sistemas" value={form.sistemas} onChange={set('sistemas')} minHeight={90} />
        <div style={{ gridColumn: '1 / -1' }}>
          <SimpleInput label="Personas clave" value={form.personas_clave} onChange={set('personas_clave')} />
        </div>
      </div>
      <SaveButton saving={saving} saved={saved} onClick={handleSave} color="#22c55e" />
    </div>
  );
}

type ExternalForm = {
  regulacion: string;
  mercado: string;
  economia: string;
  competencia: string;
};

const EXTERNAL_EMPTY: ExternalForm = {
  regulacion: '',
  mercado: '',
  economia: '',
  competencia: '',
};

export function ExternoTab({ runRaId }: { runRaId: string }) {
  const [form, setForm] = useState<ExternalForm>(EXTERNAL_EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/linear-risk/internal-external?runRaId=${encodeURIComponent(runRaId)}&type=EXTERNO`)
      .then((r) => r.json())
      .then((d: { context?: ExternalForm }) => setForm({ ...EXTERNAL_EMPTY, ...(d.context ?? {}) }))
      .catch(() => setError('No se pudo cargar el contexto externo.'))
      .finally(() => setLoading(false));
  }, [runRaId]);

  function set(key: keyof ExternalForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/linear-risk/internal-external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, runRaId, type: 'EXTERNO' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoaderSection />;

  return (
    <div>
      {error && <ErrorAlert message={error} />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <SimpleInput label="Regulación" value={form.regulacion} onChange={set('regulacion')} />
        <SimpleInput label="Mercado" value={form.mercado} onChange={set('mercado')} />
        <SimpleInput label="Economía" value={form.economia} onChange={set('economia')} />
        <SimpleInput label="Competencia" value={form.competencia} onChange={set('competencia')} />
      </div>
      <SaveButton saving={saving} saved={saved} onClick={handleSave} color="#a78bfa" />
    </div>
  );
}

export function ExitDialog({
  onContinue,
  onDraft,
  onDelete,
  deleting,
}: {
  onContinue: () => void;
  onDraft: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: 'min(92vw, 440px)',
          borderRadius: 22,
          background: 'rgba(0, 0, 0, 0.18)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 32px 60px rgba(0,0,0,0.5)',
          padding: '2rem 1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertCircle size={20} color="#f59e0b" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>¿Salir de la evaluación?</h3>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>El ID de evaluación se conserva en el sistema.</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <button
            onClick={onDraft}
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              borderRadius: 12,
              textAlign: 'left',
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.25)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <Save size={18} color="#3b82f6" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: '#93c5fd' }}>Guardar como borrador</p>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#475569' }}>El progreso se conserva. Puedes retomar la evaluación después.</p>
            </div>
          </button>

          <button
            onClick={onDelete}
            disabled={deleting}
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              borderRadius: 12,
              textAlign: 'left',
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.22)',
              cursor: deleting ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              opacity: deleting ? 0.7 : 1,
            }}
          >
            {deleting ? <Loader2 size={18} color="#f87171" style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }} /> : <X size={18} color="#f87171" style={{ flexShrink: 0 }} />}
            <div>
              <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: '#f87171' }}>Cancelar evaluación</p>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#475569' }}>Elimina todo el progreso de esta sesión permanentemente.</p>
            </div>
          </button>
        </div>

        <button
          onClick={onContinue}
          style={{
            padding: '0.6rem',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#64748b',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Continuar evaluación
        </button>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export function CopyRunCodeButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      return;
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      title={copied ? 'Copiado' : 'Copiar ID'}
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: copied ? 'rgba(59,130,246,0.14)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${copied ? 'rgba(59,130,246,0.26)' : 'rgba(255,255,255,0.08)'}`,
        color: copied ? '#93c5fd' : '#9fb0cb',
        cursor: 'pointer',
      }}
    >
      <Copy size={14} />
    </button>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2, Target, ChevronRight, Sparkles, Loader2,
  RefreshCw, FileCheck2, CheckCircle2, AlertCircle, Plus,
  ChevronLeft, ChevronsLeft, ChevronsRight, X,
  Shield, TrendingUp, Trash2, Layers3, FlaskConical, Users, Pencil,
} from 'lucide-react';
import { AiFieldAssist } from '@/shared/ai';
import type { AiFieldContract } from '@/shared/ai';

const OBJECTIVE_DESCRIPTION_CONTRACT: AiFieldContract = {
  module: 'company',
  field: 'objective_description',
  intent: 'complete',
  minWords: 10,
  maxWords: 50,
  tone: 'ejecutivo',
  output: 'text',
};

type CompanyRecord = {
  id: string; code: string; name: string; legalName: string;
  description: string; status: boolean; createdAt: string; updatedAt: string;
};

type ObjForm = {
  objective_name: string;
  objective_description: string;
  kpi: string;
  sequence_order: number | '';
  is_active: boolean;
  appetite_level: string;
  tolerance_min: number | '';
  tolerance_max: number | '';
  appetite_status: string;
  appetite_id?: string;
};

type CompanySummary = {
  elements: number;
  keyActivities: number;
  risks: number;
  controls: number;
  tests: number;
  users: number;
};

function toLocalDT(v: string) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function nowDT() {
  const n = new Date();
  const p = (v: number) => String(v).padStart(2, '0');
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}T${p(n.getHours())}:${p(n.getMinutes())}`;
}

const EMPTY = { id: '', code: '', name: '', legalName: '', description: '', status: true, createdAt: nowDT(), updatedAt: nowDT() };

const APPETITE_LEVELS = [
  { value: '', label: 'Sin definir', color: '#475569', min: 0 as number | null, max: 0 as number | null },
  { value: 'VERY_LOW',  label: 'Muy Bajo',  color: '#10b981', range: '0 – 20',   min: 0,  max: 20  },
  { value: 'LOW',       label: 'Bajo',       color: '#34d399', range: '21 – 40',  min: 21, max: 40  },
  { value: 'MODERATE',  label: 'Moderado',   color: '#3b82f6', range: '41 – 60',  min: 41, max: 60  },
  { value: 'HIGH',      label: 'Alto',       color: '#f59e0b', range: '61 – 80',  min: 61, max: 80  },
  { value: 'VERY_HIGH', label: 'Muy Alto',   color: '#ef4444', range: '81 – 100', min: 81, max: 100 },
];

// ─── Inline micro-components ───────────────────────────────
function NavBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ width: 34, height: 34, borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: disabled ? '#334155' : '#94a3b8', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
    >{children}</button>
  );
}

function ActionBtn({ children, onClick, disabled, variant = 'secondary', loading = false }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success'; loading?: boolean;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 800 },
    secondary: { background: 'rgba(255,255,255,0.03)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' },
    danger: { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' },
    success: { background: '#10b981', color: '#fff', border: 'none', fontWeight: 800 },
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ ...styles[variant], padding: '8px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: disabled ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all .2s', opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap' }}
    >{loading && <Loader2 size={14} className="animate-spin" />}{children}</button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
      {children}
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%', background: 'rgba(2,6,23,0.5)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '10px', padding: '9px 12px',
    color: '#f1f5f9', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit',
  };
}

function short3(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '-';
  const raw = String(value);
  return raw.slice(0, 3);
}

// ─── Main ──────────────────────────────────────────────────
export function CompanyEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preferredCompanyId = searchParams.get('companyId')?.trim() || '';

  const [records, setRecords] = useState<CompanyRecord[]>([]);
  const [cursor, setCursor] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiName, setAiName] = useState(false);
  const [aiDesc, setAiDesc] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const [objectives, setObjectives] = useState<any[]>([]);
  const [objLoading, setObjLoading] = useState(false);
  const [summary, setSummary] = useState<CompanySummary>({
    elements: 0, keyActivities: 0, risks: 0, controls: 0, tests: 0, users: 0,
  });
  const [appetiteCatalog, setAppetiteCatalog] = useState<Array<{
    id: string; code: string; appetite_level: string;
    tolerance_min: number | null; tolerance_max: number | null;
    metric_name: string; is_active: string;
  }>>([]);

  // ── Inline form state ─────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const formCardRef = useRef<HTMLDivElement | null>(null);
  const [editingObj, setEditingObj] = useState<any | null>(null);
  const [objForm, setObjForm] = useState<ObjForm | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formSaving, setFormSaving] = useState(false);
  const [aiObjDesc, setAiObjDesc] = useState(false);
  const [formDeleting, setFormDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  function openEditForm(obj: any) {
    const app = obj.company_objective_appetite;
    setFormMode('edit');
    setEditingObj(obj);
    setObjForm({
      objective_name: obj.objective_name ?? '',
      objective_description: obj.objective_description ?? '',
      kpi: obj.kpi ?? '',
      sequence_order: obj.sequence_order ?? '',
      is_active: obj.is_active ?? true,
      appetite_level: app?.appetite_level ?? '',
      tolerance_min: app?.tolerance_min != null ? Number(app.tolerance_min) : '',
      tolerance_max: app?.tolerance_max != null ? Number(app.tolerance_max) : '',
      appetite_status: app?.status ?? 'active',
      appetite_id: app?.id ?? obj.id_appetite ?? '',
    });
    setFormError('');
    setFormSuccess(false);
    setDeleteConfirmOpen(false);
    setShowForm(true);
    setTimeout(() => formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function openNewForm() {
    if (!form.id) return;
    const nextSequence = objectives.length
      ? Math.max(...objectives.map((obj) => Number(obj.sequence_order) || 0)) + 1
      : 1;
    setFormMode('create');
    setEditingObj({ objective_id: null, objective_code: 'AUTO', objective_name: '', company_id: form.id });
    setObjForm({
      objective_name: '', objective_description: '', kpi: '',
      sequence_order: nextSequence, is_active: true,
      appetite_level: '', tolerance_min: '', tolerance_max: '',
      appetite_status: 'active', appetite_id: '',
    });
    setFormError('');
    setFormSuccess(false);
    setDeleteConfirmOpen(false);
    setShowForm(true);
    setTimeout(() => formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function closeForm() {
    setShowForm(false);
    setEditingObj(null);
    setObjForm(null);
    setFormMode('create');
    setFormDeleting(false);
    setDeleteConfirmOpen(false);
    setFormError('');
    setFormSuccess(false);
  }

  async function saveForm() {
    if (!objForm) return;
    if (!objForm.objective_name.trim()) { setFormError('El nombre es obligatorio.'); return; }
    if (!form.id) { setFormError('Seleccione una empresa válida antes de guardar objetivos.'); return; }
    setFormSaving(true); setFormError(''); setFormSuccess(false);
    try {
      const body: any = {
        company_id: form.id,
        objective_id: editingObj?.objective_id ?? undefined,
        objective_name: objForm.objective_name.trim(),
        objective_description: objForm.objective_description.trim() || null,
        kpi: objForm.kpi.trim() || null,
        sequence_order: objForm.sequence_order !== '' ? Number(objForm.sequence_order) : null,
        is_active: objForm.is_active,
        appetite_id: objForm.appetite_id || null,
      };
      const r = await fetch('/api/linear-risk/objectives', {
        method: formMode === 'create' ? 'POST' : 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const p = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(p?.error || 'Error al guardar');
      await loadObj(form.id);
      closeForm();
    } catch (e: any) {
      setFormError(e?.message || 'Error al guardar');
    } finally {
      setFormSaving(false);
    }
  }

  async function deleteObjective() {
    if (!editingObj?.objective_id) return;
    setFormDeleting(true); setFormError('');
    try {
      const r = await fetch(`/api/linear-risk/objectives?objectiveId=${encodeURIComponent(editingObj.objective_id)}`, { method: 'DELETE' });
      const p = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(p?.error || 'No se pudo eliminar el objetivo');
      await loadObj(form.id);
      closeForm();
    } catch (e: any) {
      setFormError(e?.message || 'No se pudo eliminar el objetivo');
      setDeleteConfirmOpen(false);
    } finally {
      setFormDeleting(false);
    }
  }

  // ── Data loading ─────────────────────────────────────────
  useEffect(() => { if (form.id) loadObj(form.id); else setObjectives([]); }, [form.id]);

  useEffect(() => {
    let active = true;
    const loadAppetiteCatalog = async () => {
      try {
        const r = await fetch('/api/catalogo/apetito', { cache: 'no-store' });
        const p = await r.json().catch(() => ({ items: [] }));
        if (!active) return;
        setAppetiteCatalog(Array.isArray(p?.items) ? p.items : []);
      } catch {
        if (!active) return;
        setAppetiteCatalog([]);
      }
    };
    void loadAppetiteCatalog();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!form.id) return;
    let active = true;
    const loadSummary = async () => {
      try {
        const r = await fetch(`/api/governance/company-summary?company_id=${form.id}`, { cache: 'no-store' });
        if (!r.ok) return;
        const p = (await r.json()) as Partial<CompanySummary>;
        if (!active) return;
        setSummary({
          elements: Number(p.elements ?? 0),
          keyActivities: Number(p.keyActivities ?? 0),
          risks: Number(p.risks ?? 0),
          controls: Number(p.controls ?? 0),
          tests: Number(p.tests ?? 0),
          users: Number(p.users ?? 0),
        });
      } catch {
        if (!active) return;
      }
    };
    void loadSummary();
    return () => { active = false; };
  }, [form.id]);

  async function loadObj(kid: string) {
    setObjLoading(true);
    try {
      const r = await fetch(`/api/linear-risk/objectives?companyId=${encodeURIComponent(kid)}`, { cache: 'no-store' });
      if (r.ok) { const p = await r.json(); setObjectives(Array.isArray(p.data) ? p.data : []); }
    } catch { /* silent */ } finally { setObjLoading(false); }
  }

  async function loadRecords(preferredId?: string) {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/core/company', { cache: 'no-store' });
      if (!r.ok) throw new Error('No se pudo cargar');
      const p = (await r.json()) as { items?: CompanyRecord[] };
      const items = Array.isArray(p.items) ? p.items : [];
      setRecords(items);
      if (!items.length) { setCursor(-1); setForm(EMPTY); return; }
      const ti = preferredId ? items.findIndex(i => i.id === preferredId) : -1;
      applyRecord(items[ti >= 0 ? ti : 0], ti >= 0 ? ti : 0);
    } catch (e: any) { setError(e?.message || 'Error'); } finally { setLoading(false); }
  }

  useEffect(() => { void loadRecords(preferredCompanyId || undefined); }, [preferredCompanyId]);

  function applyRecord(r: CompanyRecord, i: number) {
    setCursor(i);
    setForm({ id: r.id, code: r.code, name: r.name, legalName: r.legalName || '', description: r.description || '', status: r.status, createdAt: toLocalDT(r.createdAt) || nowDT(), updatedAt: toLocalDT(r.updatedAt) || nowDT() });
  }

  const can = records.length > 0;
  function nav(a: 'first' | 'prev' | 'next' | 'last') {
    if (!can) return;
    const c = cursor >= 0 ? cursor : 0;
    const n = a === 'first' ? 0 : a === 'prev' ? Math.max(0, c - 1) : a === 'next' ? Math.min(records.length - 1, c + 1) : records.length - 1;
    applyRecord(records[n], n); setError(''); setSuccess(false);
  }

  async function refineObjDesc() {
    if (!objForm) return;
    setAiObjDesc(true);
    try {
      const r = await fetch('/api/ai/refine-text', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: objForm.objective_description || objForm.objective_name, field: 'objective_description', promptCode: 'GOV_KINGDOM_DESCRIPTION' }) });
      const p = await r.json().catch(() => ({}));
      const t = String(p?.refinedText ?? '').trim();
      if (t) setObjForm(prev => prev && ({ ...prev, objective_description: t }));
    } finally { setAiObjDesc(false); }
  }

  async function refineAI(field: 'name' | 'description') {
    const setter = field === 'name' ? setAiName : setAiDesc;
    setter(true);
    try {
      const r = await fetch('/api/ai/refine-text', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: form[field], field: field === 'name' ? 'empresa_nombre' : 'empresa_descripcion', promptCode: field === 'name' ? 'GOV_KINGDOM_NAME' : 'GOV_KINGDOM_DESCRIPTION' }) });
      const p = await r.json().catch(() => ({}));
      const t = String(p?.refinedText ?? '').trim();
      if (t) setForm(prev => ({ ...prev, [field]: t }));
    } finally { setter(false); }
  }

  async function save() {
    setError(''); setSuccess(false);
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/core/company', { method: form.id ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: form.id || undefined, name: form.name.trim(), legalName: form.legalName.trim(), description: form.description.trim(), status: form.status, createdAt: form.createdAt, updatedAt: form.updatedAt }) });
      const p = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(p?.message || p?.error || 'Error al guardar');
      await loadRecords(String(p?.item?.id ?? '') || undefined);
      setSuccess(true); setTimeout(() => setSuccess(false), 2500);
    } catch (e: any) { setError(e?.message || 'Error al guardar'); } finally { setSaving(false); }
  }

  const statusLabel = useMemo(() => cursor < 0 ? 'Nueva empresa' : `${cursor + 1} / ${records.length}`, [cursor, records.length]);

  // ── Render ───────────────────────────────────────────────
  if (loading && !records.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '10px', color: '#64748b' }}>
        <Loader2 className="animate-spin" size={20} /><span style={{ fontSize: '0.85rem' }}>Cargando...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100%', background: 'transparent', color: '#f8fafc' }}>
      {/* ═══ Header ═══ */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem 1.5rem', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <ActionBtn onClick={() => router.push('/score/dashboard2')} disabled={saving}>Cerrar</ActionBtn>
        <ActionBtn onClick={() => void save()} disabled={saving || loading} variant={success ? 'success' : 'primary'} loading={saving}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : success ? <CheckCircle2 size={14} /> : <FileCheck2 size={14} />}
          {saving ? 'Grabando' : success ? 'Guardado' : 'Grabar'}
        </ActionBtn>
      </div>

      {/* ═══ Summary Cards ═══ */}
      <div style={{ maxWidth: 1200, margin: '0 auto 1rem', display: 'grid', gridTemplateColumns: 'repeat(5, minmax(140px, 1fr))', gap: '0.6rem' }}>
        {[
          { key: 'key_activities', label: 'Procesos', value: summary.keyActivities, icon: Layers3, color: '#0ea5e9' },
          { key: 'risks', label: 'Riesgos', value: summary.risks, icon: Target, color: '#f97316' },
          { key: 'controls', label: 'Controles', value: summary.controls, icon: Shield, color: '#22c55e' },
          { key: 'tests', label: 'Tests', value: summary.tests, icon: FlaskConical, color: '#a855f7' },
          { key: 'users', label: 'Usuarios', value: summary.users, icon: Users, color: '#06b6d4' },
        ].map((card) => {
          const Icon = card.icon;
          const cardRoute: Record<string, string> = { key_activities: '/gestion/dashboard_proceso' };
          const route = cardRoute[card.key];
          return (
            <div key={card.key}
              onClick={() => { if (route) router.push(`${route}?company_id=${form.id}`); }}
              style={{
                borderRadius: 12, border: `1px solid ${card.color}33`,
                background: 'rgba(0,0,0,0.18)', padding: '0.85rem 0.9rem',
                display: 'flex', alignItems: 'center', gap: 12, minHeight: 74,
                cursor: route ? 'pointer' : 'default', transition: 'border-color 0.15s',
                ...(route ? { borderColor: `${card.color}55` } : {}),
              }}
              onMouseEnter={e => { if (route) (e.currentTarget as HTMLDivElement).style.borderColor = `${card.color}99`; }}
              onMouseLeave={e => { if (route) (e.currentTarget as HTMLDivElement).style.borderColor = `${card.color}55`; }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${card.color}1f`, color: card.color, border: `1px solid ${card.color}55`, boxShadow: `0 0 14px ${card.color}44` }}>
                <Icon size={16} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.66rem', fontWeight: 700 }}>{card.label}</span>
                <span style={{ color: '#f8fafc', fontSize: '1.35rem', fontWeight: 900, lineHeight: 1 }}>{card.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ Error ═══ */}
      {error && (
        <div style={{ maxWidth: 1200, margin: '0 auto 1rem', padding: '8px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '10px', color: '#f87171', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* ═══ Main content ═══ */}
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 360px) 1fr', gap: '1.25rem' }}>
        {/* Card: Nombre */}
        <div style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>Nombre Comercial</h3>
            </div>
            <button type="button" onClick={() => void refineAI('name')} disabled={aiName || saving}
              style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.25)', background: 'rgba(139,92,246,0.08)', color: '#a78bfa', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: aiName ? 0.5 : 1 }}>
              {aiName ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} IA
            </button>
          </div>
          <textarea value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Nombre de la empresa..."
            style={{ width: '100%', flex: 1, minHeight: 60, background: 'rgba(2,6,23,0.3)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem 1.5rem', color: '#f1f5f9', fontSize: '2.8rem', fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.02em', resize: 'none', outline: 'none', fontFamily: 'inherit', textAlign: 'center' }}
            onFocus={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'}
            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)'}
          />
        </div>

        {/* Card: Descripción */}
        <div style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>Descripción / Misión</h3>
            </div>
            <button type="button" onClick={() => void refineAI('description')} disabled={aiDesc || saving}
              style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.25)', background: 'rgba(139,92,246,0.08)', color: '#a78bfa', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: aiDesc ? 0.5 : 1 }}>
              {aiDesc ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} IA
            </button>
          </div>
          <textarea value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Descripción, misión y visión de la empresa..."
            style={{ width: '100%', flex: 1, minHeight: 60, background: 'rgba(2,6,23,0.3)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.75rem 1rem', color: '#f1f5f9', fontSize: '1rem', lineHeight: 1.5, resize: 'none', outline: 'none', fontFamily: 'inherit', textAlign: 'left' }}
            onFocus={e => e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'}
            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)'}
          />
        </div>
      </div>

      {/* ═══ Objectives Section ═══ */}
      {form.id && (
        <div style={{ maxWidth: 1200, margin: '2rem auto 3rem' }}>

          {/* ── Section header ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Objetivos Estratégicos</h2>
                <p style={{ margin: 0, fontSize: '0.65rem', color: '#475569' }}>
                  {objectives.length} objetivo{objectives.length !== 1 ? 's' : ''} registrado{objectives.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {showForm && (
                <button type="button" onClick={closeForm}
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: '#f87171', padding: '7px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                  <X size={13} /> Cancelar
                </button>
              )}
              <button type="button" onClick={openNewForm}
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)', color: '#34d399', padding: '7px 10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                <Plus size={13} /> Nuevo objetivo
              </button>
              <button onClick={() => void loadObj(form.id)}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', padding: '7px', borderRadius: '8px', cursor: 'pointer' }}>
                <RefreshCw size={14} className={objLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* ── Inline form card ── */}
          {showForm && objForm && (
            <div ref={formCardRef}
              style={{ background: 'rgba(0,0,0,0.22)', border: `1px solid ${formMode === 'edit' ? 'rgba(139,92,246,0.25)' : 'rgba(59,130,246,0.2)'}`, borderRadius: '16px', padding: '1.5rem 1.75rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
            >
              {/* Error */}
              {formError && (
                <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#f87171', fontSize: '0.78rem', display: 'flex', gap: 8 }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {formError}
                </div>
              )}

              {/* ── Sección: Objetivo ── */}
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <FieldLabel>Objetivo</FieldLabel>
                      <input value={objForm.objective_name}
                        onChange={e => setObjForm(p => p && ({ ...p, objective_name: e.target.value }))}
                        style={inputStyle()}
                        onFocus={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
                      />
                    </div>
                    <div>
                      <FieldLabel>KPI</FieldLabel>
                      <input value={objForm.kpi}
                        onChange={e => setObjForm(p => p && ({ ...p, kpi: e.target.value }))}
                        placeholder="Indicador clave de desempeño..."
                        style={inputStyle()}
                        onFocus={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <FieldLabel>Secuencia</FieldLabel>
                        <input type="number" value={objForm.sequence_order}
                          onChange={e => setObjForm(p => p && ({ ...p, sequence_order: e.target.value === '' ? '' : Number(e.target.value) }))}
                          style={inputStyle()}
                          onFocus={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'}
                          onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
                        />
                      </div>
                      <div>
                        <FieldLabel>Estado</FieldLabel>
                        <button type="button"
                          onClick={() => setObjForm(p => p && ({ ...p, is_active: !p.is_active }))}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', background: objForm.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.08)', border: objForm.is_active ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(239,68,68,0.2)', color: objForm.is_active ? '#34d399' : '#f87171', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                          {objForm.is_active ? 'Activo' : 'Inactivo'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <FieldLabel>Descripción</FieldLabel>
                      <button type="button" onClick={() => void refineObjDesc()} disabled={aiObjDesc || formSaving}
                        style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(139,92,246,0.25)', background: 'rgba(139,92,246,0.08)', color: '#a78bfa', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: aiObjDesc ? 0.5 : 1 }}>
                        {aiObjDesc ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} IA
                      </button>
                    </div>
                    <textarea value={objForm.objective_description}
                      onChange={e => setObjForm(p => p && ({ ...p, objective_description: e.target.value }))}
                      rows={6}
                      style={{ ...inputStyle(), resize: 'vertical', lineHeight: 1.5 }}
                      onFocus={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

              {/* ── Sección: Apetito de Riesgo ── */}
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <FieldLabel>Apetito asignado</FieldLabel>
                    <select value={objForm.appetite_id || ''}
                      onChange={e => {
                        const nextId = e.target.value;
                        const selected = appetiteCatalog.find(a => a.id === nextId);
                        setObjForm(p => p && ({ ...p, appetite_id: nextId, appetite_level: selected?.appetite_level || '', tolerance_min: selected?.tolerance_min ?? '', tolerance_max: selected?.tolerance_max ?? '', appetite_status: selected?.is_active || 'active' }));
                      }}
                      style={{ ...inputStyle(), appearance: 'none' }}>
                      <option value="">Sin apetito asignado</option>
                      {appetiteCatalog.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.appetite_level}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Tolerancia mín.</FieldLabel>
                    <input type="number" value={objForm.tolerance_min} readOnly style={inputStyle()} />
                  </div>
                  <div>
                    <FieldLabel>Tolerancia máx.</FieldLabel>
                    <input type="number" value={objForm.tolerance_max} readOnly style={inputStyle()} />
                  </div>
                </div>
              </div>

              {/* ── Form footer ── */}
              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button type="button" onClick={() => void saveForm()} disabled={formSaving || formDeleting}
                  style={{ minWidth: 168, padding: '10px 14px', borderRadius: '10px', border: 'none', background: formSuccess ? '#10b981' : '#3b82f6', color: '#fff', fontSize: '0.85rem', fontWeight: 800, cursor: formSaving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: formSaving ? 0.7 : 1, transition: 'background .2s' }}>
                  {formSaving ? <Loader2 size={15} className="animate-spin" /> : formSuccess ? <CheckCircle2 size={15} /> : <Shield size={15} />}
                  {formSaving ? 'Guardando...' : formSuccess ? 'Guardado' : 'Guardar cambios'}
                </button>
                {formMode === 'edit' && (
                  <button type="button" onClick={() => setDeleteConfirmOpen(true)} disabled={formSaving || formDeleting}
                    style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Trash2 size={14} /> Eliminar
                  </button>
                )}
                <button type="button" onClick={closeForm}
                  style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* ── Objectives Table ── */}
          <div style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', overflow: 'hidden', backdropFilter: 'blur(10px)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 800, color: '#475569', letterSpacing: '0.08em' }}>ID / OBJETIVO</th>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 800, color: '#475569', letterSpacing: '0.08em' }}>DESCRIPCIÓN</th>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 800, color: '#475569', letterSpacing: '0.08em' }}>KPI</th>
                  <th style={{ padding: '14px 24px', textAlign: 'center', fontSize: '0.68rem', fontWeight: 800, color: '#475569', letterSpacing: '0.08em' }}>APETITO</th>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 800, color: '#475569', letterSpacing: '0.08em' }}>SEC.</th>
                  <th style={{ padding: '14px 24px', textAlign: 'center', fontSize: '0.68rem', fontWeight: 800, color: '#475569', letterSpacing: '0.08em' }}>ESTADO</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '0.68rem', fontWeight: 800, color: '#475569', letterSpacing: '0.08em' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {objLoading ? (
                  <tr><td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                    <Loader2 size={24} className="animate-spin" style={{ display: 'inline-block', marginBottom: 12 }} /><br />Cargando objetivos...
                  </td></tr>
                ) : objectives.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: '#334155', fontSize: '0.82rem' }}>
                    Sin objetivos estratégicos registrados para esta Empresa.
                  </td></tr>
                ) : objectives.map((obj) => {
                  const app = obj.company_objective_appetite;
                  const aLevel = app?.appetite_level ?? '';
                  const aEntry = APPETITE_LEVELS.find(a => a.value === aLevel);
                  const aColor = aEntry?.color ?? '#fbbf24';
                  const aLabel = aEntry?.label ?? aLevel;
                  const isEditing = showForm && editingObj?.objective_id === obj.objective_id;
                  return (
                    <tr key={obj.objective_id}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background .15s', background: isEditing ? 'rgba(139,92,246,0.07)' : 'transparent', borderLeft: `3px solid ${isEditing ? '#8b5cf6' : 'transparent'}` }}
                      onMouseEnter={e => { if (!isEditing) e.currentTarget.style.background = 'rgba(59,130,246,0.04)'; }}
                      onMouseLeave={e => { if (!isEditing) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span style={{ fontSize: '0.65rem', color: '#60a5fa', fontWeight: 800, letterSpacing: '0.04em' }}>{obj.objective_code}</span>
                          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f1f5f9' }}>{obj.objective_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5, maxWidth: 280, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {obj.objective_description || <span style={{ fontStyle: 'italic', color: '#334155' }}>—</span>}
                        </p>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ fontSize: '0.78rem', color: obj.kpi ? '#cbd5e1' : '#334155', fontStyle: obj.kpi ? 'normal' : 'italic' }}>
                          {obj.kpi || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                        {aLevel ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${aColor}18`, color: aColor, padding: '3px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.04em', border: `1px solid ${aColor}40` }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: aColor, display: 'inline-block' }} />
                            {aLabel}
                          </span>
                        ) : <span style={{ color: '#334155', fontSize: '0.72rem' }}>—</span>}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>{obj.sequence_order ?? '—'}</span>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: obj.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: obj.is_active ? '#34d399' : '#f87171', padding: '4px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.02em', border: obj.is_active ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)' }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                          {obj.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button type="button" onClick={() => openEditForm(obj)} title="Editar"
                            style={{ width: 30, height: 30, borderRadius: '8px', border: isEditing ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.06)', background: isEditing ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)', color: isEditing ? '#a78bfa' : '#8b9ec0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .2s' }}
                            onMouseEnter={e => { if (!isEditing) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#93c5fd'; } }}
                            onMouseLeave={e => { if (!isEditing) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.color = '#8b9ec0'; } }}>
                            <Pencil size={13} />
                          </button>
                          <button type="button"
                            onClick={() => { openEditForm(obj); setTimeout(() => setDeleteConfirmOpen(true), 80); }}
                            title="Eliminar"
                            style={{ width: 30, height: 30, borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.04)', color: '#8b9ec0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .2s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#fca5a5'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(248,113,113,0.3)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.color = '#8b9ec0'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}>
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
        </div>
      )}

      {/* ═══ Delete Confirm Modal ═══ */}
      {deleteConfirmOpen && editingObj && (
        <div onClick={() => setDeleteConfirmOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 460, background: '#0b1120', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 16, boxShadow: '0 24px 60px rgba(2,6,23,0.6)', padding: '1.25rem' }}>
            <h4 style={{ margin: '0 0 0.5rem', color: '#f8fafc', fontWeight: 800, fontSize: '1rem' }}>Confirmar eliminación</h4>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem', lineHeight: 1.5 }}>
              Se eliminará el objetivo <strong style={{ color: '#f1f5f9' }}>{editingObj?.objective_name}</strong>. Esta acción no se puede deshacer.
            </p>
            {formError && (
              <div style={{ marginTop: '0.75rem', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#f87171', fontSize: '0.78rem' }}>
                {formError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.25rem' }}>
              <button type="button" onClick={() => setDeleteConfirmOpen(false)} disabled={formDeleting}
                style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="button" onClick={() => void deleteObjective()} disabled={formDeleting}
                style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.14)', color: '#f87171', fontSize: '0.82rem', fontWeight: 800, cursor: formDeleting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {formDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {formDeleting ? 'Eliminando...' : 'Confirmar eliminación'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Appetite = {
  id: string; code: string; scope_type: string; appetite_level: string;
  tolerance_min: number | null; tolerance_max: number | null;
  metric_name: string; metric_unit: string | null;
  effective_from: string; is_active: string;
};

const EMPTY: Omit<Appetite, 'id'> = {
  code: '', scope_type: 'GLOBAL', appetite_level: 'MODERATE',
  tolerance_min: null, tolerance_max: null,
  metric_name: '', metric_unit: null,
  effective_from: new Date().toISOString().split('T')[0], is_active: 'ACTIVE',
};

const LEVELS = ['VERY_LOW', 'LOW', 'MODERATE', 'HIGH', 'VERY_HIGH'];
const LEVEL_LABELS: Record<string, string> = {
  VERY_LOW: 'Muy Bajo', LOW: 'Bajo', MODERATE: 'Moderado', HIGH: 'Alto', VERY_HIGH: 'Muy Alto',
};
const LEVEL_COLORS: Record<string, string> = {
  VERY_LOW: '#10b981', LOW: '#34d399', MODERATE: '#3b82f6', HIGH: '#f59e0b', VERY_HIGH: '#ef4444',
};
const SCOPE_TYPES = ['GLOBAL', 'COMPANY', 'OBJECTIVE', 'ELEMENT', 'ACTIVITY'];

const COLOR = '#3b82f6';
const RGB   = '59,130,246';

const LBL: React.CSSProperties = {
  fontSize: '0.8rem', fontWeight: 500, color: '#9babc4', marginBottom: 6, display: 'block',
};

const S = {
  page:       { minHeight: '100vh', background: 'transparent', padding: '36px 20px 60px', width: '90%', margin: '0 auto' } as React.CSSProperties,
  header:     { display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '0' } as React.CSSProperties,
  title:      { margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3 } as React.CSSProperties,
  sub:        { margin: '2px 0 0', fontSize: '0.82rem', color: '#7b8fad' } as React.CSSProperties,
  card:       { background: 'rgba(0, 0, 0, 0.18)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 16, padding: '24px 28px', overflow: 'hidden' } as React.CSSProperties,
  th:         { padding: '10px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#7b8fad', textTransform: 'uppercase' as const, letterSpacing: '0.5px', textAlign: 'left' as const, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' },
  td:         { padding: '14px 16px', fontSize: '0.88rem', color: '#e7efff', borderBottom: '1px solid rgba(255,255,255,0.04)' } as React.CSSProperties,
  input:      { width: '100%', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 10, padding: '10px 12px', color: '#e7efff', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit' } as React.CSSProperties,
  select:     { width: '100%', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 10, padding: '10px 12px', color: '#e7efff', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit' } as React.CSSProperties,
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: 'linear-gradient(180deg, #1e5fd6, #1148ad)', color: '#fff', border: '1px solid #2b73ef', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' } as React.CSSProperties,
  btnDanger:  { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: 'rgba(255, 255, 255, 0.04)', color: '#8b9ec0', border: '1px solid rgba(255, 255, 255, 0.06)', cursor: 'pointer' } as React.CSSProperties,
  btnGhost:   { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: 'rgba(10, 23, 48, 0.35)', color: '#d9e8ff', border: '1px solid rgba(73, 111, 186, 0.4)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' } as React.CSSProperties,
  btnEdit:    { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: 'rgba(255, 255, 255, 0.04)', color: '#8b9ec0', border: '1px solid rgba(255, 255, 255, 0.06)', cursor: 'pointer' } as React.CSSProperties,
};

function LevelBadge({ level }: { level: string }) {
  const color = LEVEL_COLORS[level] ?? '#64748b';
  return (
    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: `${color}1f`, color, border: `1px solid ${color}44` }}>
      {LEVEL_LABELS[level] ?? level}
    </span>
  );
}

export function CatalogAppetitePage() {
  const router = useRouter();
  const [items, setItems]                 = useState<Appetite[]>([]);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');
  const [editId, setEditId]               = useState<string | null>(null);
  const [form, setForm]                   = useState<Omit<Appetite, 'id'>>(EMPTY);
  const [showForm, setShowForm]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch('/api/catalogo/apetito');
      const data = await res.json() as { items: Appetite[] };
      setItems(data.items ?? []);
    } finally { setLoading(false); }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value === '' ? null : e.target.value }));
  }

  function openNew() {
    setEditId(null);
    setForm({ ...EMPTY, effective_from: new Date().toISOString().split('T')[0] });
    setShowForm(true); setError('');
  }

  function openEdit(item: Appetite) {
    setEditId(item.id);
    setForm({
      code: item.code, scope_type: item.scope_type, appetite_level: item.appetite_level,
      tolerance_min: item.tolerance_min, tolerance_max: item.tolerance_max,
      metric_name: item.metric_name, metric_unit: item.metric_unit,
      effective_from: item.effective_from?.split('T')[0] ?? '', is_active: item.is_active,
    });
    setShowForm(true); setError('');
  }

  async function handleSave() {
    setSaving(true); setError('');
    try {
      const payload = editId ? { ...form, id: editId } : form;
      const res  = await fetch('/api/catalogo/apetito', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setShowForm(false); setEditId(null); await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    try {
      await fetch(`/api/catalogo/apetito?id=${id}`, { method: 'DELETE' });
      setConfirmDelete(null); await load();
    } finally { setSaving(false); }
  }

  function handleClose() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/modelo/gobernanza/catalogo');
  }

  return (
    <div style={S.page}>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={S.header}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa', flexShrink: 0, marginTop: 2 }}>
            <ShieldAlert size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={S.title}>Apetito de riesgo</h1>
            <p style={S.sub}>Mantenimiento de la tabla <code style={{ color: COLOR, fontSize: '0.75rem' }}>catalog_appetite</code></p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button style={S.btnPrimary} onClick={openNew}><Plus size={14} /> Nuevo registro</button>
            <button style={S.btnGhost} onClick={handleClose}><X size={14} /> Cerrar</button>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ ...S.card, marginBottom: '1.5rem', padding: '1.5rem' }}>
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>
            {editId ? 'Editar registro' : 'Nuevo registro de apetito'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={LBL}>Código *</label>
              <input style={S.input} value={form.code} onChange={field('code')} placeholder="ej. APT-001" />
            </div>
            <div>
              <label style={LBL}>Tipo de alcance</label>
              <select style={S.select} value={form.scope_type} onChange={field('scope_type')}>
                {SCOPE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={LBL}>Nivel de apetito *</label>
              <select style={S.select} value={form.appetite_level} onChange={field('appetite_level')}>
                {LEVELS.map(l => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
              </select>
            </div>
            <div>
              <label style={LBL}>Métrica *</label>
              <input style={S.input} value={form.metric_name} onChange={field('metric_name')} placeholder="ej. Pérdida esperada" />
            </div>
            <div>
              <label style={LBL}>Unidad</label>
              <input style={S.input} value={form.metric_unit ?? ''} onChange={field('metric_unit')} placeholder="ej. COP, %" />
            </div>
            <div>
              <label style={LBL}>Vigencia desde</label>
              <input style={S.input} type="date" value={form.effective_from} onChange={field('effective_from')} />
            </div>
            <div>
              <label style={LBL}>Tolerancia mín.</label>
              <input style={S.input} type="number" step="0.01" value={form.tolerance_min ?? ''} onChange={field('tolerance_min')} placeholder="0.00" />
            </div>
            <div>
              <label style={LBL}>Tolerancia máx.</label>
              <input style={S.input} type="number" step="0.01" value={form.tolerance_max ?? ''} onChange={field('tolerance_max')} placeholder="100.00" />
            </div>
            <div>
              <label style={LBL}>Estado</label>
              <select style={S.select} value={form.is_active} onChange={field('is_active')}>
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={S.btnPrimary} onClick={() => void handleSave()} disabled={saving}>
              <Save size={13} /> {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button style={S.btnGhost} onClick={() => { setShowForm(false); setEditId(null); }}><X size={13} /> Cancelar</button>
          </div>
          {error && <p style={{ margin: '0.75rem 0 0', color: '#f87171', fontSize: '0.75rem' }}>{error}</p>}
        </div>
      )}

      {/* Table */}
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
            <tr>
              <th style={S.th}>Código</th>
              <th style={S.th}>Alcance</th>
              <th style={S.th}>Nivel</th>
              <th style={S.th}>Métrica</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Tolerancia</th>
              <th style={S.th}>Vigencia</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Estado</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ ...S.td, textAlign: 'center', color: '#475569', padding: '2rem' }}>Cargando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} style={{ ...S.td, textAlign: 'center', color: '#475569', padding: '2rem' }}>Sin registros. Cree el primero.</td></tr>
            ) : items.map(item => (
              <tr key={item.id}>
                <td style={S.td}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: COLOR, background: `rgba(${RGB},0.1)`, padding: '2px 8px', borderRadius: 5 }}>{item.code}</span>
                </td>
                <td style={{ ...S.td, color: '#94a3b8', fontSize: '0.75rem' }}>{item.scope_type}</td>
                <td style={S.td}><LevelBadge level={item.appetite_level} /></td>
                <td style={S.td}>
                  <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{item.metric_name}</span>
                  {item.metric_unit && <span style={{ color: '#64748b', fontSize: '0.72rem', marginLeft: 4 }}>{item.metric_unit}</span>}
                </td>
                <td style={{ ...S.td, textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                  {item.tolerance_min != null || item.tolerance_max != null
                    ? `${item.tolerance_min ?? '—'} – ${item.tolerance_max ?? '—'}`
                    : '—'}
                </td>
                <td style={{ ...S.td, fontSize: '0.75rem', color: '#64748b' }}>{item.effective_from?.split('T')[0] ?? '—'}</td>
                <td style={{ ...S.td, textAlign: 'center' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: item.is_active === 'ACTIVE' ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)', color: item.is_active === 'ACTIVE' ? '#10b981' : '#64748b' }}>
                    {item.is_active === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td style={{ ...S.td, textAlign: 'right' }}>
                  {confirmDelete === item.id ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.72rem', color: '#f87171' }}>¿Confirmar?</span>
                      <button style={S.btnDanger} onClick={() => void handleDelete(item.id)} disabled={saving}>Sí</button>
                      <button style={S.btnGhost} onClick={() => setConfirmDelete(null)}>No</button>
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      <button style={S.btnEdit} onClick={() => openEdit(item)} title="Editar"><Pencil size={14} /></button>
                      <button style={S.btnDanger} onClick={() => setConfirmDelete(item.id)} title="Eliminar"><Trash2 size={14} /></button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

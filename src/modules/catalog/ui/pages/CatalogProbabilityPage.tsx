'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, Gauge } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ProbabilityRow = {
  catalog_probability_id: number;
  code: string;
  name: string;
  description: string | null;
  ordinal: number;
  numeric_value: number | null;
  is_active: boolean;
};

const EMPTY: Omit<ProbabilityRow, 'catalog_probability_id'> = {
  code: '', name: '', description: '', ordinal: 0, numeric_value: null, is_active: true,
};

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
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: 'linear-gradient(180deg, #1e5fd6, #1148ad)', color: '#fff', border: '1px solid #2b73ef', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' } as React.CSSProperties,
  btnDanger:  { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: 'rgba(255, 255, 255, 0.04)', color: '#8b9ec0', border: '1px solid rgba(255, 255, 255, 0.06)', cursor: 'pointer' } as React.CSSProperties,
  btnGhost:   { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: 'rgba(10, 23, 48, 0.35)', color: '#d9e8ff', border: '1px solid rgba(73, 111, 186, 0.4)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' } as React.CSSProperties,
  btnEdit:    { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: 'rgba(255, 255, 255, 0.04)', color: '#8b9ec0', border: '1px solid rgba(255, 255, 255, 0.06)', cursor: 'pointer' } as React.CSSProperties,
};

export function CatalogProbabilityPage() {
  const router = useRouter();
  const [items, setItems]                 = useState<ProbabilityRow[]>([]);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');
  const [editId, setEditId]               = useState<number | null>(null);
  const [form, setForm]                   = useState<Omit<ProbabilityRow, 'catalog_probability_id'>>(EMPTY);
  const [showForm, setShowForm]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch('/api/catalogo/probabilidad');
      const data = await res.json() as { items: ProbabilityRow[] };
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  function openNew() {
    setEditId(null);
    setForm({ ...EMPTY, ordinal: items.length + 1 });
    setShowForm(true);
    setError('');
  }

  function openEdit(item: ProbabilityRow) {
    setEditId(item.catalog_probability_id);
    setForm({
      code:          item.code,
      name:          item.name,
      description:   item.description ?? '',
      ordinal:       item.ordinal,
      numeric_value: item.numeric_value,
      is_active:     item.is_active,
    });
    setShowForm(true);
    setError('');
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const payload = editId
        ? { ...form, catalog_probability_id: editId }
        : form;
      const res  = await fetch('/api/catalogo/probabilidad', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setShowForm(false);
      setEditId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setSaving(true);
    try {
      await fetch(`/api/catalogo/probabilidad?id=${id}`, { method: 'DELETE' });
      setConfirmDelete(null);
      await load();
    } finally {
      setSaving(false);
    }
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
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={S.header}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa', flexShrink: 0, marginTop: 2 }}>
            <Gauge size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={S.title}>Probabilidad</h1>
            <p style={S.sub}>Mantenimiento de la tabla <code style={{ color: COLOR, fontSize: '0.75rem' }}>catalog_ra_probability</code></p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button style={S.btnPrimary} onClick={openNew}>
              <Plus size={14} /> Nuevo nivel
            </button>
            <button style={S.btnGhost} onClick={handleClose}>
              <X size={14} /> Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Inline form */}
      {showForm && (
        <div style={{ ...S.card, marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
          <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>
            {editId ? 'Editar nivel de probabilidad' : 'Nuevo nivel de probabilidad'}
          </p>

          {/* Row 1: code / name / ordinal / numeric_value */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 100px 140px', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <span style={LBL}>Código *</span>
              <input style={S.input} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="ej. HIGH" />
            </div>
            <div>
              <span style={LBL}>Nombre *</span>
              <input style={S.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ej. Alto" />
            </div>
            <div>
              <span style={LBL}>Ordinal</span>
              <input style={S.input} type="number" min={0} value={form.ordinal} onChange={e => setForm(f => ({ ...f, ordinal: Number(e.target.value) }))} />
            </div>
            <div>
              <span style={LBL}>Valor numérico</span>
              <input style={S.input} type="number" step="0.0001" value={form.numeric_value ?? ''} onChange={e => setForm(f => ({ ...f, numeric_value: e.target.value === '' ? null : Number(e.target.value) }))} placeholder="ej. 0.8000" />
            </div>
          </div>

          {/* Row 2: description + is_active + actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'end' }}>
            <div>
              <span style={LBL}>Descripción</span>
              <input style={S.input} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción opcional" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: 1 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.78rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                Activo
              </label>
              <button style={S.btnPrimary} onClick={() => void handleSave()} disabled={saving}>
                <Save size={13} /> {saving ? 'Guardando…' : 'Guardar'}
              </button>
              <button style={S.btnGhost} onClick={() => { setShowForm(false); setEditId(null); }}>
                <X size={13} />
              </button>
            </div>
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
              <th style={S.th}>Nombre</th>
              <th style={S.th}>Descripción</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Ordinal</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Valor numérico</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Estado</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', color: '#475569', padding: '2rem' }}>Cargando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', color: '#475569', padding: '2rem' }}>Sin registros. Cree el primero.</td></tr>
            ) : items.map(item => (
              <tr key={item.catalog_probability_id}>
                <td style={S.td}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: COLOR, background: `rgba(${RGB},0.1)`, padding: '2px 8px', borderRadius: 5 }}>{item.code}</span>
                </td>
                <td style={{ ...S.td, fontWeight: 600, color: '#f1f5f9' }}>{item.name}</td>
                <td style={{ ...S.td, color: '#64748b', fontSize: '0.78rem' }}>{item.description ?? '—'}</td>
                <td style={{ ...S.td, textAlign: 'center', color: '#64748b' }}>{item.ordinal}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                  {item.numeric_value != null ? Number(item.numeric_value).toFixed(4) : '—'}
                </td>
                <td style={{ ...S.td, textAlign: 'center' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: item.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)', color: item.is_active ? '#10b981' : '#64748b' }}>
                    {item.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td style={{ ...S.td, textAlign: 'right' }}>
                  {confirmDelete === item.catalog_probability_id ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.72rem', color: '#f87171' }}>¿Confirmar?</span>
                      <button style={S.btnDanger} onClick={() => void handleDelete(item.catalog_probability_id)} disabled={saving}>Sí</button>
                      <button style={S.btnGhost} onClick={() => setConfirmDelete(null)}>No</button>
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      <button style={S.btnEdit} onClick={() => openEdit(item)}><Pencil size={12} /> Editar</button>
                      <button style={S.btnDanger} onClick={() => setConfirmDelete(item.catalog_probability_id)}><Trash2 size={12} /></button>
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


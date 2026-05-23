'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

type FreqLevel = { id: string; code: string; name: string; sort_order: number; is_active: boolean };

const EMPTY: Omit<FreqLevel, 'id'> = { code: '', name: '', sort_order: 0, is_active: true };

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

export function CatalogFrequencyPage() {
  const router = useRouter();
  const [items, setItems]               = useState<FreqLevel[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const [editId, setEditId]             = useState<string | null>(null);
  const [form, setForm]                 = useState<Omit<FreqLevel, 'id'>>(EMPTY);
  const [showForm, setShowForm]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch('/api/catalogo/frecuencia');
      const data = await res.json() as { items: FreqLevel[] };
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  function openNew() {
    setEditId(null);
    setForm({ ...EMPTY, sort_order: items.length + 1 });
    setShowForm(true);
    setError('');
  }

  function openEdit(item: FreqLevel) {
    setEditId(item.id);
    setForm({ code: item.code, name: item.name, sort_order: item.sort_order, is_active: item.is_active });
    setShowForm(true);
    setError('');
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const payload = editId ? { ...form, id: editId } : form;
      const res  = await fetch('/api/catalogo/frecuencia', {
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

  async function handleDelete(id: string) {
    setSaving(true);
    try {
      await fetch(`/api/catalogo/frecuencia?id=${id}`, { method: 'DELETE' });
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
            <Clock size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={S.title}>Frecuencia</h1>
            <p style={S.sub}>Mantenimiento de la tabla <code style={{ color: COLOR, fontSize: '0.75rem' }}>catalog_activity_frequency</code></p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button style={S.btnPrimary} onClick={openNew}>
              <Plus size={14} /> Nueva frecuencia
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
            {editId ? 'Editar frecuencia' : 'Nueva frecuencia'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 120px auto', gap: '0.75rem', alignItems: 'end' }}>
            <div>
              <div style={LBL}>Código *</div>
              <input style={S.input} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="ej. DAILY" />
            </div>
            <div>
              <div style={LBL}>Nombre *</div>
              <input style={S.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ej. Diaria" />
            </div>
            <div>
              <div style={LBL}>Orden</div>
              <input style={S.input} type="number" min={0} value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', paddingBottom: 1 }}>
              <button style={S.btnPrimary} onClick={() => void handleSave()} disabled={saving}>
                <Save size={13} /> {saving ? 'Guardando…' : 'Guardar'}
              </button>
              <button style={S.btnGhost} onClick={() => { setShowForm(false); setEditId(null); }}>
                <X size={13} />
              </button>
            </div>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.78rem', color: '#94a3b8' }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              Activo
            </label>
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
              <th style={{ ...S.th, textAlign: 'center' }}>Orden</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Estado</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', color: '#475569', padding: '2rem' }}>Cargando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', color: '#475569', padding: '2rem' }}>Sin registros. Cree el primero.</td></tr>
            ) : items.map(item => (
              <tr key={item.id}>
                <td style={S.td}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: COLOR, background: `rgba(${RGB},0.1)`, padding: '2px 8px', borderRadius: 5 }}>{item.code}</span>
                </td>
                <td style={{ ...S.td, fontWeight: 600, color: '#f1f5f9' }}>{item.name}</td>
                <td style={{ ...S.td, textAlign: 'center', color: '#64748b' }}>{item.sort_order}</td>
                <td style={{ ...S.td, textAlign: 'center' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: item.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)', color: item.is_active ? '#10b981' : '#64748b' }}>
                    {item.is_active ? 'Activo' : 'Inactivo'}
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

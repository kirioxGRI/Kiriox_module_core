'use client';

import { useState, useEffect, useRef } from 'react';
import type { GraphEntity } from '@/modules/structural-map/domain/types/GraphTypes';
import type { ScreenPos } from '@/modules/structural-map/domain/types/ModeloTypes';
import { CRIT_LEVELS } from '@/modules/structural-map/domain/types/ModeloTypes';

type Props = {
  entity:   GraphEntity;
  position: ScreenPos;
  onSave:   (id: string, patch: { name?: string; description?: string | null; criticality_level?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCancel: () => void;
};

export function EntityEditForm({ entity, position, onSave, onDelete, onCancel }: Props) {
  const [name,  setName]  = useState(entity.name ?? '');
  const [desc,  setDesc]  = useState(entity.description ?? '');
  const [crit,  setCrit]  = useState(entity.criticality_level ?? 'medium');
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onCancel]);

  async function handleSave() {
    if (!name.trim()) { setError('El nombre es requerido'); return; }
    setSaving(true); setError('');
    try {
      await onSave(entity.id, {
        name: name.trim(),
        description: desc.trim() || null,
        criticality_level: crit,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar "${entity.name}"? Esta acción eliminará también todas sus relaciones.`)) return;
    setDeleting(true);
    try { await onDelete(entity.id); }
    catch (e) { setError(e instanceof Error ? e.message : 'Error al eliminar'); setDeleting(false); }
  }

  const W = 300;
  let left = position.x - W / 2;
  let top  = position.y + 20;
  if (typeof window !== 'undefined') {
    if (left < 8) left = 8;
    if (left + W > window.innerWidth - 8) left = window.innerWidth - W - 8;
    if (top + 300 > window.innerHeight - 8) top = position.y - 310;
  }

  const inp: React.CSSProperties = { width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, color: '#f1f5f9', fontSize: '0.78rem', padding: '0.42rem 0.6rem', outline: 'none', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { display: 'block', color: '#64748b', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ position: 'fixed', left, top, width: W, zIndex: 300, background: 'rgba(10,14,32,0.97)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 12, padding: '0.85rem 1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
        <span style={{ color: '#fbbf24', fontSize: '0.78rem', fontWeight: 800 }}>Editar entidad</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ color: '#475569', fontSize: '0.65rem', fontFamily: 'monospace' }}>{entity.code}</span>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1 }}>✕</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div>
          <label style={lbl}>Tipo (solo lectura)</label>
          <div style={{ ...inp, color: '#64748b', userSelect: 'none' as const }}>{entity.entity_type_name}</div>
        </div>
        <div>
          <label style={lbl}>Nombre *</label>
          <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void handleSave(); }} style={inp} />
        </div>
        <div>
          <label style={lbl}>Criticidad</label>
          <select value={crit} onChange={(e) => setCrit(e.target.value)} style={inp}>
            {CRIT_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Descripción</label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción breve" style={inp} />
        </div>

        {error && <p style={{ margin: 0, color: '#f87171', fontSize: '0.7rem', fontWeight: 600 }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
          <button
            onClick={() => void handleSave()}
            disabled={saving || !name.trim()}
            style={{ flex: 1, padding: '0.48rem', borderRadius: 8, border: '1px solid rgba(251,191,36,0.45)', background: 'rgba(251,191,36,0.12)', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 800, cursor: !name.trim() ? 'not-allowed' : 'pointer', opacity: !name.trim() ? 0.4 : 1 }}
          >{saving ? 'Guardando…' : 'Guardar cambios'}</button>
          <button
            onClick={() => void handleDelete()}
            disabled={deleting}
            style={{ padding: '0.48rem 0.65rem', borderRadius: 8, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
          >{deleting ? '…' : 'Eliminar'}</button>
          <button onClick={onCancel} style={{ padding: '0.48rem 0.65rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#64748b', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

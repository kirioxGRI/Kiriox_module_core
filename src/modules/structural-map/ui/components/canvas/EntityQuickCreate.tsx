'use client';

import { useState, useEffect, useRef } from 'react';
import type { EntityType } from '@/modules/structural-map/domain/types/PortfolioTypes';
import type { ScreenPos } from '@/modules/structural-map/domain/types/ModeloTypes';
import { CRIT_LEVELS } from '@/modules/structural-map/domain/types/ModeloTypes';
import { useDraggable } from './useDraggable';

type Props = {
  position:    ScreenPos;
  entityTypes: EntityType[];
  onSave:      (input: { entity_type_id: string; code: string; name: string; description?: string; criticality_level: string }) => Promise<void>;
  onCancel:    () => void;
};

function generateCode(typeName: string, existingCodes: string[]): string {
  const prefix = typeName.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X').padEnd(3, 'X');
  const timePart = Date.now().toString(36).slice(-4).toUpperCase();
  const randomPart = Math.floor(Math.random() * 1296).toString(36).padStart(2, '0').toUpperCase();
  let candidate = `${prefix}_${timePart}${randomPart}`;
  while (existingCodes.includes(candidate)) {
    const fallbackRandom = Math.floor(Math.random() * 1296).toString(36).padStart(2, '0').toUpperCase();
    candidate = `${prefix}_${timePart}${fallbackRandom}`;
  }
  return candidate;
}

export function EntityQuickCreate({ position, entityTypes, onSave, onCancel }: Props) {
  const [typeId, setTypeId]     = useState('');
  const [name, setName]         = useState('');
  const [desc, setDesc]         = useState('');
  const [crit, setCrit]         = useState('medium');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const nameRef                 = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  const selectedType = entityTypes.find((t) => t.id === typeId);
  const autoCode     = selectedType ? generateCode(selectedType.code, []) : '';

  async function handleSave() {
    if (!typeId)        { setError('Selecciona un tipo'); return; }
    if (!name.trim())   { setError('El nombre es requerido'); return; }
    setSaving(true); setError('');
    try {
      await onSave({ entity_type_id: typeId, code: autoCode, name: name.trim(), description: desc.trim() || undefined, criticality_level: crit });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear entidad');
      setSaving(false);
    }
  }

  const W = 300;
  const { pos, startDragging } = useDraggable(position, W, 320);

  const inp: React.CSSProperties = { width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, color: '#f1f5f9', fontSize: '0.78rem', padding: '0.42rem 0.6rem', outline: 'none', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { display: 'block', color: '#64748b', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' };

  return (
    <div
      data-draggable-root
      onClick={(e) => e.stopPropagation()}
      style={{ position: 'fixed', left: pos.x, top: pos.y, width: W, zIndex: 300, background: 'rgba(10,14,32,0.97)', border: '1px solid rgba(99,102,241,0.45)', borderRadius: 12, padding: '0.85rem 1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}
    >
      <div
        onPointerDown={startDragging}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', cursor: 'grab', userSelect: 'none' }}
      >
        <span style={{ color: '#a5b4fc', fontSize: '0.78rem', fontWeight: 800 }}>Nueva entidad</span>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1 }}>✕</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div>
          <label style={lbl}>Tipo *</label>
          <select value={typeId} onChange={(e) => setTypeId(e.target.value)} style={inp}>
            <option value="">— seleccionar —</option>
            {entityTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {selectedType && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.5rem', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6 }}>
            <span style={{ color: '#64748b', fontSize: '0.62rem' }}>Código auto:</span>
            <span style={{ color: '#a5b4fc', fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 700 }}>{autoCode}</span>
          </div>
        )}

        <div>
          <label style={lbl}>Nombre *</label>
          <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void handleSave(); }} placeholder="Ej. Pasarela de pagos" style={inp} />
        </div>

        <div>
          <label style={lbl}>Criticidad</label>
          <select value={crit} onChange={(e) => setCrit(e.target.value)} style={inp}>
            {CRIT_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label style={lbl}>Descripción (opcional)</label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción breve" style={inp} />
        </div>

        {error && <p style={{ margin: 0, color: '#f87171', fontSize: '0.7rem', fontWeight: 600 }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
          <button
            onClick={() => void handleSave()}
            disabled={saving || !typeId || !name.trim()}
            style={{ flex: 1, padding: '0.48rem', borderRadius: 8, border: '1px solid rgba(99,102,241,0.5)', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontSize: '0.75rem', fontWeight: 800, cursor: !typeId || !name.trim() ? 'not-allowed' : 'pointer', opacity: !typeId || !name.trim() ? 0.4 : 1 }}
          >{saving ? 'Creando…' : 'Crear entidad'}</button>
          <button onClick={onCancel} style={{ padding: '0.48rem 0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#64748b', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

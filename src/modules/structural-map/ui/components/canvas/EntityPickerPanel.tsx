'use client';

import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import type { GraphEntity } from '@/modules/structural-map/domain/types/GraphTypes';
import type { ScreenPos } from '@/modules/structural-map/domain/types/ModeloTypes';

type Props = {
  position:         ScreenPos;
  allEntities:      GraphEntity[];
  currentEntityIds: Set<string>;
  onSelect:         (entity: GraphEntity) => void;
  onCancel:         () => void;
};

const TYPE_COLORS: Record<string, string> = {
  SERVICE: '#6366f1', PROCESS: '#14b8a6', APPLICATION: '#3b82f6',
  SYSTEM: '#8b5cf6', SUPPLIER: '#f59e0b', RISK: '#ef4444',
  CONTROL: '#22c55e', OBLIGATION: '#ec4899', DEFAULT: '#64748b',
};

export function EntityPickerPanel({ position, allEntities, currentEntityIds, onSelect, onCancel }: Props) {
  const [query, setQuery]   = useState('');
  const [picked, setPicked] = useState<GraphEntity | null>(null);
  const inputRef            = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onCancel]);

  const available = allEntities.filter(
    (e) => !currentEntityIds.has(e.id) &&
      (e.name?.toLowerCase().includes(query.toLowerCase()) ||
       e.code.toLowerCase().includes(query.toLowerCase()) ||
       e.entity_type_name.toLowerCase().includes(query.toLowerCase()))
  );

  function handleConfirm() {
    if (picked) onSelect(picked);
  }

  const W = 320;
  let left = position.x - W / 2;
  let top  = position.y + 20;
  if (typeof window !== 'undefined') {
    if (left < 8) left = 8;
    if (left + W > window.innerWidth - 8) left = window.innerWidth - W - 8;
    if (top + 440 > window.innerHeight - 8) top = position.y - 450;
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', left, top, width: W, zIndex: 300,
        background: 'rgba(10,14,32,0.98)',
        border: '1px solid rgba(56,189,248,0.4)',
        borderRadius: 12, padding: '0.85rem 1rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.65)',
        backdropFilter: 'blur(12px)',
        display: 'flex', flexDirection: 'column', gap: '0.6rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#38bdf8', fontSize: '0.78rem', fontWeight: 800 }}>
          Agregar entidad existente
        </span>
        <button
          onClick={onCancel}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1 }}
        >✕</button>
      </div>

      <p style={{ margin: 0, color: '#475569', fontSize: '0.68rem', lineHeight: 1.4 }}>
        Selecciona una entidad del modelo para agregarla al canvas y conectarla.
      </p>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.35rem 0.6rem' }}>
        <Search size={13} color="#64748b" style={{ flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPicked(null); }}
          placeholder="Buscar por nombre, código o tipo…"
          style={{ background: 'none', border: 'none', color: '#f1f5f9', fontSize: '0.75rem', outline: 'none', flex: 1 }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setPicked(null); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.75rem', flexShrink: 0 }}>✕</button>
        )}
      </div>

      {/* Entity list */}
      <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {available.length === 0 && (
          <p style={{ margin: 0, color: '#334155', fontSize: '0.72rem', textAlign: 'center', padding: '1rem 0' }}>
            {query ? 'Sin resultados para esa búsqueda' : 'Todas las entidades ya están en el canvas'}
          </p>
        )}
        {available.map((e) => {
          const typeColor = TYPE_COLORS[e.entity_type_code] ?? TYPE_COLORS.DEFAULT;
          const isSelected = picked?.id === e.id;
          return (
            <button
              key={e.id}
              onClick={() => setPicked(isSelected ? null : e)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.55rem',
                padding: '0.45rem 0.6rem', borderRadius: 8, textAlign: 'left',
                border: isSelected ? `1px solid ${typeColor}55` : '1px solid rgba(255,255,255,0.05)',
                background: isSelected ? `${typeColor}10` : 'rgba(255,255,255,0.02)',
                cursor: 'pointer', transition: 'background 0.12s',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: typeColor, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, color: '#f1f5f9', fontSize: '0.74rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {e.name ?? e.code}
                </p>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.62rem' }}>
                  {e.entity_type_name} · <span style={{ fontFamily: 'monospace' }}>{e.code}</span>
                </p>
              </div>
              {isSelected && <span style={{ color: typeColor, fontSize: '0.75rem', flexShrink: 0 }}>✓</span>}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.4rem', paddingTop: '0.25rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={handleConfirm}
          disabled={!picked}
          style={{
            flex: 1, padding: '0.48rem', borderRadius: 8,
            border: '1px solid rgba(56,189,248,0.5)',
            background: picked ? 'rgba(56,189,248,0.15)' : 'rgba(56,189,248,0.05)',
            color: '#38bdf8', fontSize: '0.75rem', fontWeight: 800,
            cursor: picked ? 'pointer' : 'not-allowed', opacity: picked ? 1 : 0.4,
          }}
        >
          {picked ? `Agregar "${picked.name ?? picked.code}"` : 'Selecciona una entidad'}
        </button>
        <button
          onClick={onCancel}
          style={{ padding: '0.48rem 0.65rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#64748b', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
        >Cancelar</button>
      </div>
    </div>
  );
}

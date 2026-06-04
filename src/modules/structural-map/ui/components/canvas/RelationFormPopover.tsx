'use client';

import { useState, useEffect, useRef } from 'react';
import type { RelationType } from '@/modules/structural-map/domain/types/PortfolioTypes';
import type { GraphEntity, GraphRelation } from '@/modules/structural-map/domain/types/GraphTypes';
import type { ScreenPos } from '@/modules/structural-map/domain/types/ModeloTypes';
import { STRENGTH_OPTIONS, STRENGTH_STYLE } from '@/modules/structural-map/domain/types/ModeloTypes';

type CreateProps = {
  mode: 'create';
  position:      ScreenPos;
  sourceEntity:  GraphEntity;
  targetEntity:  GraphEntity;
  relationTypes: RelationType[];
  onSave:   (input: { source_entity_id: string; target_entity_id: string; relation_type_id: string; strength: string; weight: number; description?: string }) => Promise<void>;
  onCancel: () => void;
};

type EditProps = {
  mode: 'edit';
  position:      ScreenPos;
  relation:      GraphRelation;
  sourceEntity:  GraphEntity | undefined;
  targetEntity:  GraphEntity | undefined;
  relationTypes: RelationType[];
  onSave:   (id: string, patch: { relation_type_id?: string; strength?: string; weight?: number; description?: string | null }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCancel: () => void;
};

type Props = CreateProps | EditProps;

const inp: React.CSSProperties = { width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, color: '#f1f5f9', fontSize: '0.78rem', padding: '0.42rem 0.6rem', outline: 'none', boxSizing: 'border-box' };
const lbl: React.CSSProperties = { display: 'block', color: '#64748b', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' };

export function RelationFormPopover(props: Props) {
  const { position, relationTypes, onCancel } = props;
  const isCreate = props.mode === 'create';

  const [typeId,    setTypeId]    = useState(isCreate ? '' : props.relation.relation_type_id);
  const [strength,  setStrength]  = useState<string>(isCreate ? 'medium' : (props.relation.strength ?? 'medium'));
  const [weight,    setWeight]    = useState<string>(isCreate ? '0.5' : String(props.relation.weight ?? 0.5));
  const [desc,      setDesc]      = useState(isCreate ? '' : (props.relation.description ?? ''));
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [error,     setError]     = useState('');
  const firstRef                  = useRef<HTMLSelectElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onCancel]);

  function validateWeight(v: string): number | null {
    const n = parseFloat(v);
    if (Number.isNaN(n) || n < 0 || n > 1) return null;
    return n;
  }

  async function handleSave() {
    if (!typeId) { setError('Selecciona un tipo de relación'); return; }
    const w = validateWeight(weight);
    if (w === null) { setError('El peso debe ser un número entre 0 y 1'); return; }
    if (!STRENGTH_OPTIONS.includes(strength as typeof STRENGTH_OPTIONS[number])) {
      setError('Fuerza inválida'); return;
    }
    setSaving(true); setError('');
    try {
      if (isCreate) {
        await (props as CreateProps).onSave({ source_entity_id: (props as CreateProps).sourceEntity.id, target_entity_id: (props as CreateProps).targetEntity.id, relation_type_id: typeId, strength, weight: w, description: desc.trim() || undefined });
      } else {
        await (props as EditProps).onSave((props as EditProps).relation.id, { relation_type_id: typeId, strength, weight: w, description: desc.trim() || null });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error'); setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('¿Eliminar esta relación? Esta acción no se puede deshacer.')) return;
    setDeleting(true);
    try { await (props as EditProps).onDelete((props as EditProps).relation.id); }
    catch (e) { setError(e instanceof Error ? e.message : 'Error'); setDeleting(false); }
  }

  const W = 320;
  let left = position.x - W / 2;
  let top  = position.y + 20;
  if (typeof window !== 'undefined') {
    if (left < 8) left = 8;
    if (left + W > window.innerWidth - 8) left = window.innerWidth - W - 8;
    if (top + 380 > window.innerHeight - 8) top = position.y - 390;
  }

  const src = isCreate ? (props as CreateProps).sourceEntity : (props as EditProps).sourceEntity;
  const tgt = isCreate ? (props as CreateProps).targetEntity : (props as EditProps).targetEntity;
  const strengthStyle = STRENGTH_STYLE[strength as keyof typeof STRENGTH_STYLE];

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', left, top, width: W, zIndex: 300, background: 'rgba(10,14,32,0.97)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 12, padding: '0.85rem 1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
        <span style={{ color: '#a5b4fc', fontSize: '0.78rem', fontWeight: 800 }}>{isCreate ? 'Definir relación' : 'Editar relación'}</span>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
      </div>

      {(src || tgt) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem', padding: '0.35rem 0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: 7 }}>
          <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 600, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{src?.name ?? '?'}</span>
          <span style={{ color: strengthStyle?.color ?? '#6366f1', fontWeight: 900, fontSize: '1rem', margin: '0 2px' }}>→</span>
          <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 600, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tgt?.name ?? '?'}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div>
          <label style={lbl}>Tipo de relación *</label>
          <select ref={firstRef} value={typeId} onChange={(e) => setTypeId(e.target.value)} style={inp}>
            <option value="">— seleccionar —</option>
            {relationTypes.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
          </select>
        </div>

        <div>
          <label style={lbl}>Fuerza *</label>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {STRENGTH_OPTIONS.map((s) => {
              const st = STRENGTH_STYLE[s];
              return (
                <button key={s} onClick={() => setStrength(s)} style={{ flex: 1, padding: '0.35rem 0', borderRadius: 7, border: `1px solid ${strength === s ? st.color : 'rgba(255,255,255,0.1)'}`, background: strength === s ? `${st.color}18` : 'rgba(255,255,255,0.03)', color: strength === s ? st.color : '#64748b', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }}>
                  {st.label}
                </button>
              );
            })}
          </div>
          {strengthStyle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem' }}>
              <div style={{ flex: 1, height: strengthStyle.width, background: strengthStyle.color, borderRadius: 999, opacity: 0.8 }} />
              <span style={{ color: '#64748b', fontSize: '0.62rem' }}>grosor {strengthStyle.width}px</span>
            </div>
          )}
        </div>

        <div>
          <label style={lbl}>Peso (0 a 1)</label>
          <input type="number" min="0" max="1" step="0.05" value={weight} onChange={(e) => setWeight(e.target.value)} style={inp} />
        </div>

        <div>
          <label style={lbl}>Descripción (opcional)</label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Justificación de la relación" style={inp} />
        </div>

        {error && <p style={{ margin: 0, color: '#f87171', fontSize: '0.7rem', fontWeight: 600 }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
          <button onClick={() => void handleSave()} disabled={saving || !typeId} style={{ flex: 1, padding: '0.48rem', borderRadius: 8, border: '1px solid rgba(99,102,241,0.5)', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontSize: '0.75rem', fontWeight: 800, cursor: !typeId ? 'not-allowed' : 'pointer', opacity: !typeId ? 0.4 : 1 }}>
            {saving ? 'Guardando…' : 'Guardar relación'}
          </button>
          {!isCreate && (
            <button onClick={() => void handleDelete()} disabled={deleting} style={{ padding: '0.48rem 0.65rem', borderRadius: 8, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
              {deleting ? '…' : 'Eliminar'}
            </button>
          )}
          <button onClick={onCancel} style={{ padding: '0.48rem 0.65rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#64748b', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

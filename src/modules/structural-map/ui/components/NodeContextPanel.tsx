'use client';

import { useState, useEffect } from 'react';
import type { GraphEntity, GraphRelation } from '@/modules/structural-map/domain/types/GraphTypes';
import type { RelationType } from '@/modules/structural-map/domain/types/PortfolioTypes';

type Props = {
  selected: GraphEntity | GraphRelation | null;
  entities: GraphEntity[];
  relationTypes?: RelationType[];
  onDeleteRelation?: (id: string) => Promise<void>;
  onUpdateRelation?: (id: string, input: {
    source_entity_id?: string;
    target_entity_id?: string;
    relation_type_id?: string;
    weight?: number | null;
    strength?: string | null;
    description?: string | null;
  }) => Promise<void>;
  onSimulateNode?: (entityId: string, scenario: string) => void;
};

const CRIT_COLORS: Record<string, string> = { critical: '#f87171', high: '#fb923c', medium: '#fbbf24', low: '#4ade80' };

const STRENGTH_OPTIONS = [
  { value: 'weak', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'strong', label: 'Alta' },
  { value: 'critical', label: 'Crítica' },
];

function ScorePill({ label, value, color }: { label: string; value: number; color?: string }) {
  const c = color ?? '#94a3b8';
  return (
    <div style={{ background: `${c}18`, border: `1px solid ${c}44`, borderRadius: 7, padding: '0.35rem 0.5rem', textAlign: 'center' }}>
      <div style={{ color: c, fontSize: '1rem', fontWeight: 800 }}>{value.toFixed(1)}</div>
      <div style={{ color: '#64748b', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600 }}>{label}</span>
      <span style={{ color: color ?? '#f1f5f9', fontSize: '0.75rem', fontWeight: 700, maxWidth: '55%', textAlign: 'right' }}>{value ?? '—'}</span>
    </div>
  );
}

function isRelation(x: GraphEntity | GraphRelation): x is GraphRelation {
  return 'source_entity_id' in x;
}

function asPercentWeight(weight: number | null): number | null {
  if (weight == null) return null;
  return weight <= 1 ? weight * 100 : weight;
}

const S: Record<string, React.CSSProperties> = {
  panel:  { height: '100%', overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  card:   { background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '0.75rem' },
  title:  { color: '#94a3b8', fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' },
  name:   { color: '#f8fafc', fontSize: '1rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '0.2rem' },
  code:   { color: '#475569', fontSize: '0.7rem', fontFamily: 'monospace' },
  btnRow: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' as const, marginTop: '0.6rem' },
  btn:    { padding: '0.35rem 0.65rem', borderRadius: 7, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#cbd5e1', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' },
  delBtn: { padding: '0.35rem 0.65rem', borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' },
  saveBtn: { padding: '0.4rem 0.75rem', borderRadius: 7, border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', flex: 1 },
  field:  { display: 'flex', flexDirection: 'column' as const, gap: '0.2rem' },
  label:  { color: '#64748b', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  input:  { width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#f1f5f9', fontSize: '0.76rem', padding: '0.45rem 0.55rem', outline: 'none', boxSizing: 'border-box' as const },
  select: { width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#f1f5f9', fontSize: '0.76rem', padding: '0.45rem 0.55rem', outline: 'none', boxSizing: 'border-box' as const },
  textarea: { width: '100%', minHeight: 60, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#f1f5f9', fontSize: '0.76rem', padding: '0.45rem 0.55rem', outline: 'none', resize: 'vertical' as const, fontFamily: 'inherit', boxSizing: 'border-box' as const },
  msg:    { margin: 0, fontSize: '0.7rem', fontWeight: 700 },
};

function EntityDetail({ entity, onSimulate }: { entity: GraphEntity; onSimulate?: (scenario: string) => void }) {
  const crit = entity.criticality_level ?? 'medium';
  const critColor = CRIT_COLORS[crit] ?? '#94a3b8';
  return (
    <>
      <div style={S.card}>
        <p style={S.title as React.CSSProperties}>Entidad seleccionada</p>
        <p style={S.name as React.CSSProperties}>{entity.name ?? entity.code}</p>
        <p style={S.code as React.CSSProperties}>{entity.code}</p>
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ padding: '0.18rem 0.55rem', borderRadius: 999, background: `${critColor}22`, border: `1px solid ${critColor}55`, color: critColor, fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>{crit}</span>
          <span style={{ padding: '0.18rem 0.55rem', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.65rem', fontWeight: 700 }}>{entity.entity_type_name}</span>
          {entity.is_critical_node && <span style={{ padding: '0.18rem 0.55rem', borderRadius: 999, background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171', fontSize: '0.65rem', fontWeight: 800 }}>CRÍTICO</span>}
          {entity.is_spof && <span style={{ padding: '0.18rem 0.55rem', borderRadius: 999, background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.4)', color: '#fb923c', fontSize: '0.65rem', fontWeight: 800 }}>SPOF</span>}
        </div>
      </div>

      {(entity.criticality_score != null || entity.resilience_score != null || entity.exposure_score != null) && (
        <div style={S.card}>
          <p style={S.title as React.CSSProperties}>Scores calculados</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
            {entity.criticality_score != null && <ScorePill label="Criticidad" value={entity.criticality_score} color="#f87171" />}
            {entity.resilience_score  != null && <ScorePill label="Resiliencia" value={entity.resilience_score} color="#4ade80" />}
            {entity.exposure_score    != null && <ScorePill label="Exposición" value={entity.exposure_score} color="#fb923c" />}
          </div>
        </div>
      )}

      <div style={S.card}>
        <p style={S.title as React.CSSProperties}>Métricas de grafo</p>
        <Row label="Grado total" value={entity.total_degree} />
        <Row label="Estado" value={entity.status} />
        {entity.description && <Row label="Descripción" value={entity.description} />}
      </div>

      {onSimulate && (
        <div style={S.card}>
          <p style={S.title as React.CSSProperties}>Simular desde este nodo</p>
          <div style={S.btnRow}>
            {['FAILURE', 'DEGRADATION', 'COMPROMISE'].map((s) => (
              <button key={s} onClick={() => onSimulate(s)} style={S.btn as React.CSSProperties}>{s}</button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function RelationDetail({
  relation,
  entities,
  relationTypes,
  onDelete,
  onUpdate,
}: {
  relation: GraphRelation;
  entities: GraphEntity[];
  relationTypes?: RelationType[];
  onDelete?: () => Promise<void>;
  onUpdate?: (input: {
    source_entity_id?: string;
    target_entity_id?: string;
    relation_type_id?: string;
    weight?: number | null;
    strength?: string | null;
    description?: string | null;
  }) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editSrc, setEditSrc] = useState(relation.source_entity_id);
  const [editTgt, setEditTgt] = useState(relation.target_entity_id);
  const [editType, setEditType] = useState(relation.relation_type_id);
  const [editWeight, setEditWeight] = useState(relation.weight != null ? String(asPercentWeight(relation.weight)) : '');
  const [editStrength, setEditStrength] = useState(relation.strength ?? 'medium');
  const [editDesc, setEditDesc] = useState(relation.description ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setEditing(false);
    setEditSrc(relation.source_entity_id);
    setEditTgt(relation.target_entity_id);
    setEditType(relation.relation_type_id);
    setEditWeight(relation.weight != null ? String(asPercentWeight(relation.weight)) : '');
    setEditStrength(relation.strength ?? 'medium');
    setEditDesc(relation.description ?? '');
    setMsg('');
  }, [relation]);

  const src = entities.find((e) => e.id === relation.source_entity_id);
  const tgt = entities.find((e) => e.id === relation.target_entity_id);

  async function handleSave() {
    if (!onUpdate) return;
    setSaving(true);
    setMsg('');
    try {
      const input: Record<string, unknown> = {};
      if (editSrc !== relation.source_entity_id) input.source_entity_id = editSrc;
      if (editTgt !== relation.target_entity_id) input.target_entity_id = editTgt;
      if (editType !== relation.relation_type_id) input.relation_type_id = editType;
      const w = editWeight ? Number(editWeight) : null;
      if (w !== relation.weight) input.weight = w;
      if (editStrength !== relation.strength) input.strength = editStrength || null;
      if (editDesc !== (relation.description ?? '')) input.description = editDesc || null;

      if (Object.keys(input).length === 0) {
        setMsg('Sin cambios');
        setSaving(false);
        return;
      }
      await onUpdate(input as Parameters<typeof onUpdate>[0]);
      setMsg('Guardado ✓');
      setEditing(false);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (editing && onUpdate) {
    return (
      <>
        <div style={S.card}>
          <p style={S.title as React.CSSProperties}>Editar relación</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            <div style={S.field}>
              <label style={S.label as React.CSSProperties}>Origen</label>
              <select value={editSrc} onChange={(e) => setEditSrc(e.target.value)} style={S.select as React.CSSProperties}>
                {entities.map((ent) => (
                  <option key={ent.id} value={ent.id}>{ent.name ?? ent.code}</option>
                ))}
              </select>
            </div>
            <div style={S.field}>
              <label style={S.label as React.CSSProperties}>Destino</label>
              <select value={editTgt} onChange={(e) => setEditTgt(e.target.value)} style={S.select as React.CSSProperties}>
                {entities.filter((ent) => ent.id !== editSrc).map((ent) => (
                  <option key={ent.id} value={ent.id}>{ent.name ?? ent.code}</option>
                ))}
              </select>
            </div>
            {relationTypes && relationTypes.length > 0 && (
              <div style={S.field}>
                <label style={S.label as React.CSSProperties}>Tipo de relación</label>
                <select value={editType} onChange={(e) => setEditType(e.target.value)} style={S.select as React.CSSProperties}>
                  {relationTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>{rt.name} {rt.is_directional ? '→' : '↔'}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={S.field}>
                <label style={S.label as React.CSSProperties}>Fuerza</label>
                <select value={editStrength} onChange={(e) => setEditStrength(e.target.value)} style={S.select as React.CSSProperties}>
                  {STRENGTH_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label as React.CSSProperties}>Peso</label>
                <input type="number" min="0" max="100" step="0.1" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} placeholder="Ej. 75" style={S.input as React.CSSProperties} />
              </div>
            </div>
            <div style={S.field}>
              <label style={S.label as React.CSSProperties}>Descripción</label>
              <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Descripción de la dependencia" style={S.textarea as React.CSSProperties} />
            </div>
          </div>
          {msg && <p style={{ ...S.msg as React.CSSProperties, color: msg.includes('✓') ? '#4ade80' : '#f87171', marginTop: '0.4rem' }}>{msg}</p>}
          <div style={{ ...S.btnRow, marginTop: '0.5rem' }}>
            <button onClick={() => void handleSave()} disabled={saving} style={S.saveBtn as React.CSSProperties}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button onClick={() => { setEditing(false); setMsg(''); }} style={S.btn as React.CSSProperties}>Cancelar</button>
          </div>
        </div>
        {onDelete && (
          <div style={{ ...S.btnRow, padding: '0 0.75rem' }}>
            <button onClick={() => void onDelete()} style={S.delBtn as React.CSSProperties}>Eliminar relación</button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div style={S.card}>
        <p style={S.title as React.CSSProperties}>Relación seleccionada</p>
        <p style={S.name as React.CSSProperties}>{relation.relation_type_name}</p>
        <p style={S.code as React.CSSProperties}>{relation.relation_type_code}</p>
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0' }}>
          <Row label="Origen" value={src?.name ?? src?.code ?? relation.source_entity_id} />
          <Row label="Destino" value={tgt?.name ?? tgt?.code ?? relation.target_entity_id} />
          <Row label="Dirección" value={relation.is_directional ? 'Direccional →' : 'Bidireccional ↔'} />
          {relation.weight != null && <Row label="Peso" value={`${asPercentWeight(relation.weight)?.toFixed(1)}%`} />}
          {relation.strength && <Row label="Fuerza" value={relation.strength} />}
          {relation.description && <Row label="Descripción" value={relation.description} />}
        </div>
        <div style={S.btnRow}>
          {onUpdate && (
            <button onClick={() => setEditing(true)} style={S.btn as React.CSSProperties}>✏️ Editar</button>
          )}
          {onDelete && (
            <button onClick={() => void onDelete()} style={S.delBtn as React.CSSProperties}>Eliminar relación</button>
          )}
        </div>
      </div>
    </>
  );
}

export function NodeContextPanel({ selected, entities, relationTypes, onDeleteRelation, onUpdateRelation, onSimulateNode }: Props) {
  if (!selected) {
    return (
      <div style={{ ...S.panel, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#475569' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>◎</div>
          <p style={{ fontSize: '0.75rem', fontWeight: 600 }}>Selecciona un nodo o arista</p>
          <p style={{ fontSize: '0.68rem', color: '#334155', marginTop: '0.25rem' }}>para ver sus detalles aquí</p>
        </div>
      </div>
    );
  }

  if (isRelation(selected)) {
    return (
      <div style={S.panel}>
        <RelationDetail
          relation={selected}
          entities={entities}
          relationTypes={relationTypes}
          onDelete={onDeleteRelation ? () => onDeleteRelation(selected.id) : undefined}
          onUpdate={onUpdateRelation ? (input) => onUpdateRelation(selected.id, input) : undefined}
        />
      </div>
    );
  }

  return (
    <div style={S.panel}>
      <EntityDetail
        entity={selected}
        onSimulate={onSimulateNode ? (scenario) => onSimulateNode(selected.id, scenario) : undefined}
      />
    </div>
  );
}

'use client';

import type { GraphEntity, GraphRelation } from '@/modules/structural-map/domain/types/GraphTypes';

type Props = {
  selected: GraphEntity | GraphRelation | null;
  entities: GraphEntity[];
  onDeleteRelation?: (id: string) => Promise<void>;
  onSimulateNode?: (entityId: string, scenario: string) => void;
};

const CRIT_COLORS: Record<string, string> = { critical: '#f87171', high: '#fb923c', medium: '#fbbf24', low: '#4ade80' };

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

const S: Record<string, React.CSSProperties> = {
  panel:  { height: '100%', overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  card:   { background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '0.75rem' },
  title:  { color: '#94a3b8', fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' },
  name:   { color: '#f8fafc', fontSize: '1rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '0.2rem' },
  code:   { color: '#475569', fontSize: '0.7rem', fontFamily: 'monospace' },
  btnRow: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' as const, marginTop: '0.6rem' },
  btn:    { padding: '0.35rem 0.65rem', borderRadius: 7, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#cbd5e1', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' },
  delBtn: { padding: '0.35rem 0.65rem', borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' },
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

function RelationDetail({ relation, entities, onDelete }: { relation: GraphRelation; entities: GraphEntity[]; onDelete?: () => Promise<void> }) {
  const src = entities.find((e) => e.id === relation.source_entity_id);
  const tgt = entities.find((e) => e.id === relation.target_entity_id);
  return (
    <div style={S.card}>
      <p style={S.title as React.CSSProperties}>Relación seleccionada</p>
      <p style={S.name as React.CSSProperties}>{relation.relation_type_name}</p>
      <p style={S.code as React.CSSProperties}>{relation.relation_type_code}</p>
      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0' }}>
        <Row label="Origen" value={src?.name ?? src?.code ?? relation.source_entity_id} />
        <Row label="Destino" value={tgt?.name ?? tgt?.code ?? relation.target_entity_id} />
        <Row label="Dirección" value={relation.is_directional ? 'Direccional →' : 'Bidireccional ↔'} />
        {relation.weight != null && <Row label="Peso" value={relation.weight.toFixed(2)} />}
        {relation.strength && <Row label="Fuerza" value={relation.strength} />}
        {relation.description && <Row label="Descripción" value={relation.description} />}
      </div>
      {onDelete && (
        <div style={S.btnRow}>
          <button onClick={() => void onDelete()} style={S.delBtn as React.CSSProperties}>Eliminar relación</button>
        </div>
      )}
    </div>
  );
}

export function NodeContextPanel({ selected, entities, onDeleteRelation, onSimulateNode }: Props) {
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
          onDelete={onDeleteRelation ? () => onDeleteRelation(selected.id) : undefined}
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

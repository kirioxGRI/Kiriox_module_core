'use client';

import { useState } from 'react';
import { Plus, Search, ChevronDown } from 'lucide-react';
import type { EntityType, RelationType } from '@/modules/structural-map/domain/types/PortfolioTypes';
import type { GraphEntity } from '@/modules/structural-map/domain/types/GraphTypes';

type Props = {
  entityTypes: EntityType[];
  relationTypes: RelationType[];
  entities: GraphEntity[];
  rootEntityId: string;
  onCreateEntity: (input: { entity_type_id: string; code: string; name: string; description?: string; criticality_level?: string }) => Promise<void>;
  onCreateRelation: (input: { source_entity_id: string; target_entity_id: string; relation_type_id: string }) => Promise<void>;
};

const CRIT_LEVELS = ['critical', 'high', 'medium', 'low'];

const S: Record<string, React.CSSProperties> = {
  panel:   { height: '100%', overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  section: { background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' },
  hdr:     { padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' as const },
  hdrTxt:  { color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  body:    { padding: '0.75rem' },
  label:   { display: 'block', color: '#64748b', fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.25rem' },
  input:   { width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#f1f5f9', fontSize: '0.78rem', padding: '0.42rem 0.6rem', outline: 'none', boxSizing: 'border-box' as const },
  btn:     { width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' },
};

function Collapsible({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={S.section}>
      <div style={S.hdr} onClick={() => setOpen((p) => !p)}>
        <span style={S.hdrTxt}>{title}</span>
        <ChevronDown size={12} color="#64748b" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }} />
      </div>
      {open && <div style={S.body}>{children}</div>}
    </div>
  );
}

export function EntityCatalogPanel({ entityTypes, relationTypes, entities, rootEntityId, onCreateEntity, onCreateRelation }: Props) {
  const [search, setSearch]     = useState('');
  const [creating, setCreating] = useState(false);
  const [linking, setLinking]   = useState(false);

  const [newTypeId, setNewTypeId]     = useState('');
  const [newCode, setNewCode]         = useState('');
  const [newName, setNewName]         = useState('');
  const [newDesc, setNewDesc]         = useState('');
  const [newCrit, setNewCrit]         = useState('medium');

  const [linkSrc, setLinkSrc]   = useState(rootEntityId);
  const [linkTgt, setLinkTgt]   = useState('');
  const [linkType, setLinkType] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkMsg, setLinkMsg]   = useState('');

  const filtered = entities.filter((e) => e.name?.toLowerCase().includes(search.toLowerCase()) || e.code.toLowerCase().includes(search.toLowerCase()));

  async function handleCreate() {
    if (!newTypeId || !newCode || !newName) return;
    setCreating(true);
    try {
      await onCreateEntity({ entity_type_id: newTypeId, code: newCode, name: newName, description: newDesc || undefined, criticality_level: newCrit });
      setNewTypeId(''); setNewCode(''); setNewName(''); setNewDesc(''); setNewCrit('medium');
    } finally { setCreating(false); }
  }

  async function handleLink() {
    if (!linkSrc || !linkTgt || !linkType) return;
    setLinkBusy(true); setLinkMsg('');
    try {
      await onCreateRelation({ source_entity_id: linkSrc, target_entity_id: linkTgt, relation_type_id: linkType });
      setLinkMsg('Relación creada'); setLinkTgt(''); setLinkType('');
    } catch (e) {
      setLinkMsg(e instanceof Error ? e.message : 'Error');
    } finally { setLinkBusy(false); }
  }

  return (
    <div style={S.panel}>
      <Collapsible title="Crear entidad" defaultOpen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div>
            <label style={S.label}>Tipo</label>
            <select value={newTypeId} onChange={(e) => setNewTypeId(e.target.value)} style={S.input}>
              <option value="">— seleccionar —</option>
              {entityTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Código</label>
            <input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Ej. APP_001" style={S.input} />
          </div>
          <div>
            <label style={S.label}>Nombre</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre de la entidad" style={S.input} />
          </div>
          <div>
            <label style={S.label}>Descripción</label>
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Opcional" style={S.input} />
          </div>
          <div>
            <label style={S.label}>Criticidad</label>
            <select value={newCrit} onChange={(e) => setNewCrit(e.target.value)} style={S.input}>
              {CRIT_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={() => void handleCreate()} disabled={creating || !newTypeId || !newCode || !newName} style={{ ...S.btn, opacity: !newTypeId || !newCode || !newName ? 0.4 : 1 }}>
            <Plus size={13} /> {creating ? 'Creando…' : 'Crear entidad'}
          </button>
        </div>
      </Collapsible>

      <Collapsible title="Crear relación" defaultOpen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div>
            <label style={S.label}>Origen</label>
            <select value={linkSrc} onChange={(e) => setLinkSrc(e.target.value)} style={S.input}>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.name ?? e.code}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Tipo de relación</label>
            <select value={linkType} onChange={(e) => setLinkType(e.target.value)} style={S.input}>
              <option value="">— seleccionar —</option>
              {relationTypes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Destino</label>
            <select value={linkTgt} onChange={(e) => setLinkTgt(e.target.value)} style={S.input}>
              <option value="">— seleccionar —</option>
              {entities.filter((e) => e.id !== linkSrc).map((e) => <option key={e.id} value={e.id}>{e.name ?? e.code}</option>)}
            </select>
          </div>
          {linkMsg && <p style={{ margin: 0, fontSize: '0.7rem', color: linkMsg.includes('creada') ? '#4ade80' : '#f87171' }}>{linkMsg}</p>}
          <button onClick={() => void handleLink()} disabled={linkBusy || !linkSrc || !linkTgt || !linkType} style={{ ...S.btn, opacity: !linkSrc || !linkTgt || !linkType ? 0.4 : 1 }}>
            <Plus size={13} /> {linkBusy ? 'Vinculando…' : 'Crear relación'}
          </button>
        </div>
      </Collapsible>

      <Collapsible title={`Entidades del grafo (${entities.length})`}>
        <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '0.35rem 0.6rem' }}>
          <Search size={12} color="#64748b" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" style={{ background: 'none', border: 'none', color: '#f1f5f9', fontSize: '0.75rem', outline: 'none', flex: 1 }} />
        </div>
        <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {filtered.map((e) => (
            <div key={e.id} style={{ padding: '0.4rem 0.5rem', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ margin: 0, color: '#f1f5f9', fontSize: '0.74rem', fontWeight: 600 }}>{e.name ?? e.code}</p>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.66rem' }}>{e.entity_type_name} · {e.entity_type_code === 'RISK' ? '⚠' : ''}{e.code}</p>
            </div>
          ))}
          {filtered.length === 0 && <p style={{ color: '#475569', fontSize: '0.72rem', textAlign: 'center', margin: '0.5rem 0' }}>Sin resultados</p>}
        </div>
      </Collapsible>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, ChevronDown, MousePointerClick, Link2, CircleDot } from 'lucide-react';
import type { EntityType, RelationType } from '@/modules/structural-map/domain/types/PortfolioTypes';
import type { GraphEntity } from '@/modules/structural-map/domain/types/GraphTypes';
import styles from './EntityCatalogPanel.module.css';

type RelationSeed = {
  sourceId: string | null;
  targetId: string | null;
  stage: 'idle' | 'picking-target' | 'ready';
};

type Props = {
  entityTypes: EntityType[];
  relationTypes: RelationType[];
  entities: GraphEntity[];
  allEntities?: any[];
  rootEntityId: string;
  selectedEntityId?: string | null;
  relationSeed?: RelationSeed;
  autoOpenCreateTrigger?: number;
  onClearRelationSeed?: () => void;
  onCreateEntity: (input: { entity_type_id: string; code: string; name: string; description?: string; criticality_level?: string }) => Promise<{ id: string }>;
  onCreateRelation: (input: {
    source_entity_id: string;
    target_entity_id: string;
    relation_type_id: string;
    weight?: number;
    strength?: string;
    description?: string;
  }) => Promise<void>;
};

const CRIT_LEVELS = ['critical', 'high', 'medium', 'low'];
const STRENGTH_LEVELS = [
  { value: 'weak', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'strong', label: 'Alta' },
  { value: 'critical', label: 'Crítica' },
];

function generateUniqueHexCode(): string {
  const timePart = Date.now().toString(16).slice(-6);
  const randomPart = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return (timePart + randomPart).toUpperCase();
}

function Collapsible({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setOpen((prev) => !prev)}>
        <span className={styles.sectionHeaderText}>{title}</span>
        <ChevronDown size={12} color="#64748b" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }} />
      </div>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </div>
  );
}

function findEntity(entities: GraphEntity[], id: string | null) {
  return id ? entities.find((entity) => entity.id === id) ?? null : null;
}

export function EntityCatalogPanel({
  entityTypes,
  relationTypes,
  entities,
  allEntities = [],
  rootEntityId,
  selectedEntityId,
  relationSeed,
  autoOpenCreateTrigger,
  onClearRelationSeed,
  onCreateEntity,
  onCreateRelation,
}: Props) {
  const [search, setSearch]   = useState('');
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(true);
  const createSectionRef = useRef<HTMLDivElement>(null);

  /* Force-open and scroll into view when triggered from canvas context menu */
  useEffect(() => {
    if (autoOpenCreateTrigger && autoOpenCreateTrigger > 0) {
      setCreateOpen(true);
      setTimeout(() => {
        createSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  }, [autoOpenCreateTrigger]);

  const [newTypeId, setNewTypeId] = useState('');
  const [newCode, setNewCode] = useState(generateUniqueHexCode());
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCrit, setNewCrit] = useState('medium');

  const [linkSrc, setLinkSrc] = useState(rootEntityId);
  const [linkTgt, setLinkTgt] = useState('');
  const [linkType, setLinkType] = useState('');
  const [linkWeight, setLinkWeight] = useState('');
  const [linkStrength, setLinkStrength] = useState('medium');
  const [linkDesc, setLinkDesc] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkMsg, setLinkMsg] = useState('');

  useEffect(() => {
    if (!relationSeed) return;
    if (relationSeed.sourceId) setLinkSrc(relationSeed.sourceId);
    if (relationSeed.targetId) setLinkTgt(relationSeed.targetId);
  }, [relationSeed]);

  const selectedEntity = useMemo(
    () => findEntity(entities, selectedEntityId ?? null),
    [entities, selectedEntityId]
  );
  const sourceEntity = useMemo(() => findEntity(entities, linkSrc), [entities, linkSrc]);
  const targetEntity = useMemo(() => findEntity(entities, linkTgt), [entities, linkTgt]);

  const filtered = entities.filter((entity) => {
    const q = search.toLowerCase();
    return entity.name?.toLowerCase().includes(q) || entity.code.toLowerCase().includes(q);
  });

  const relationTypeOptions = useMemo(
    () => [...relationTypes].sort((left, right) => left.name.localeCompare(right.name)),
    [relationTypes]
  );

  async function handleCreate() {
    if (!newTypeId || !newCode || !newName) return;
    setCreating(true);
    try {
      await onCreateEntity({
        entity_type_id: newTypeId,
        code: newCode,
        name: newName,
        description: newDesc || undefined,
        criticality_level: newCrit,
      });
      setNewTypeId('');
      setNewCode(generateUniqueHexCode());
      setNewName('');
      setNewDesc('');
      setNewCrit('medium');
    } finally {
      setCreating(false);
    }
  }

  async function handleLink() {
    if (!linkSrc || !linkTgt || !linkType) return;
    setLinkBusy(true);
    setLinkMsg('');
    try {
      await onCreateRelation({
        source_entity_id: linkSrc,
        target_entity_id: linkTgt,
        relation_type_id: linkType,
        weight: linkWeight ? Number(linkWeight) : undefined,
        strength: linkStrength || undefined,
        description: linkDesc || undefined,
      });
      setLinkMsg('Relación creada');
      setLinkTgt('');
      setLinkType('');
      setLinkWeight('');
      setLinkStrength('medium');
      setLinkDesc('');
      onClearRelationSeed?.();
    } catch (error) {
      setLinkMsg(error instanceof Error ? error.message : 'Error al crear relación');
    } finally {
      setLinkBusy(false);
    }
  }

  return (
    <div className={styles.panel}>
      {/* ── Crear entidad ── */}
      <div ref={createSectionRef}>
        <div className={styles.section}>
          <div
            className={styles.sectionHeader}
            onClick={() => setCreateOpen((prev) => !prev)}
          >
            <span className={styles.sectionHeaderText}>Crear entidad</span>
            <ChevronDown
              size={12}
              color="#64748b"
              style={{ transform: createOpen ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }}
            />
          </div>
          {createOpen && (
        <div className={styles.formStack}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Tipo</label>
            <select value={newTypeId} onChange={(event) => setNewTypeId(event.target.value)} className={styles.select}>
              <option value="">— seleccionar —</option>
              {entityTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Código (Autogenerado)</label>
            <input value={newCode} readOnly className={styles.input} style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: '#94a3b8', cursor: 'not-allowed' }} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Nombre</label>
            <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Nombre de la entidad" className={styles.input} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Descripción</label>
            <input value={newDesc} onChange={(event) => setNewDesc(event.target.value)} placeholder="Opcional" className={styles.input} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Criticidad</label>
            <select value={newCrit} onChange={(event) => setNewCrit(event.target.value)} className={styles.select}>
              {CRIT_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => void handleCreate()}
            disabled={creating || !newTypeId || !newCode || !newName}
            className={styles.actionButton}
          >
            <Plus size={13} /> {creating ? 'Creando…' : 'Crear entidad'}
          </button>
        </div>
          )}
        </div>
      </div>

      <Collapsible title="Crear relación" defaultOpen>
        <div className={styles.formStack}>
          <div className={styles.hintCard}>
            <div className={styles.hintTitle}>Flujo visual recomendado</div>
            <div className={styles.hintText}>
              Haz clic derecho en un nodo para marcar el origen. Luego haz clic derecho en otro nodo para prellenar el destino y completa aquí el tipo, la fuerza y el peso de la dependencia.
            </div>
          </div>

          {relationSeed?.stage === 'picking-target' && sourceEntity && (
            <div className={styles.hintCard}>
              <div className={styles.hintTitle}>Seleccionando destino</div>
              <div className={styles.hintText}>
                Origen marcado desde el grafo: <strong>{sourceEntity.name ?? sourceEntity.code}</strong>. Falta escoger el nodo destino con clic derecho.
              </div>
            </div>
          )}

          {(sourceEntity || targetEntity) && (
            <div className={styles.pillRow}>
              {sourceEntity && (
                <span className={styles.pill}>
                  <CircleDot size={12} />
                  Origen
                  <span className={styles.pillCode}>{sourceEntity.code}</span>
                </span>
              )}
              {targetEntity && (
                <span className={styles.pill}>
                  <Link2 size={12} />
                  Destino
                  <span className={styles.pillCode}>{targetEntity.code}</span>
                </span>
              )}
            </div>
          )}

          <div className={styles.miniActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={!selectedEntity}
              onClick={() => selectedEntity && setLinkSrc(selectedEntity.id)}
            >
              Usar nodo seleccionado como origen
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={!selectedEntity || selectedEntity.id === linkSrc}
              onClick={() => selectedEntity && selectedEntity.id !== linkSrc && setLinkTgt(selectedEntity.id)}
            >
              Usar nodo seleccionado como destino
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => { onClearRelationSeed?.(); setLinkTgt(''); }}>
              Limpiar selección visual
            </button>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Origen</label>
            <select value={linkSrc} onChange={(e) => setLinkSrc(e.target.value)} className={styles.select}>
              <option value="">— seleccionar origen —</option>
              {allEntities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name ?? e.code} {e.id === rootEntityId ? '(Raíz)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Entidad Destino</label>
            <select value={linkTgt} onChange={(e) => setLinkTgt(e.target.value)} className={styles.select}>
              <option value="">— seleccionar destino —</option>
              {allEntities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name ?? e.code} {e.id === rootEntityId ? '(Raíz)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Tipo de relación</label>
            <select value={linkType} onChange={(event) => setLinkType(event.target.value)} className={styles.select}>
              <option value="">— seleccionar —</option>
              {relationTypeOptions.map((relationType) => (
                <option key={relationType.id} value={relationType.id}>
                  {relationType.name} {relationType.is_directional ? '→' : '↔'}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inlineGrid}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Fuerza</label>
              <select value={linkStrength} onChange={(event) => setLinkStrength(event.target.value)} className={styles.select}>
                {STRENGTH_LEVELS.map((strength) => (
                  <option key={strength.value} value={strength.value}>
                    {strength.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Peso</label>
              <input
                value={linkWeight}
                onChange={(event) => setLinkWeight(event.target.value)}
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="Ej. 75"
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Descripción de la dependencia</label>
            <textarea
              value={linkDesc}
              onChange={(event) => setLinkDesc(event.target.value)}
              placeholder="Explica por qué existe la dependencia o qué sostiene esta relación."
              className={styles.textarea}
            />
          </div>

          {linkMsg && (
            <p className={`${styles.message} ${linkMsg.includes('creada') ? styles.messageSuccess : styles.messageError}`}>
              {linkMsg}
            </p>
          )}

          <button
            onClick={() => void handleLink()}
            disabled={linkBusy || !linkSrc || !linkTgt || !linkType}
            className={styles.actionButton}
          >
            <MousePointerClick size={13} /> {linkBusy ? 'Vinculando…' : 'Crear relación'}
          </button>
        </div>
      </Collapsible>

      <Collapsible title={`Entidades del grafo (${entities.length})`}>
        <div className={styles.searchWrap}>
          <Search size={12} color="#64748b" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar…"
            className={styles.searchInput}
          />
        </div>
        <div className={styles.entityList}>
          {filtered.map((entity) => (
            <div key={entity.id} className={styles.entityItem}>
              <p className={styles.entityName}>{entity.name ?? entity.code}</p>
              <p className={styles.entityMeta}>
                {entity.entity_type_name} · {entity.code}
              </p>
            </div>
          ))}
          {filtered.length === 0 && <p className={styles.emptyState}>Sin resultados</p>}
        </div>
      </Collapsible>
    </div>
  );
}

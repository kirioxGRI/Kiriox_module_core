'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { RelationType } from '@/modules/structural-map/domain/types/PortfolioTypes';
import type { GraphEntity, GraphRelation } from '@/modules/structural-map/domain/types/GraphTypes';
import type { ScreenPos } from '@/modules/structural-map/domain/types/ModeloTypes';
import { STRENGTH_OPTIONS, STRENGTH_STYLE } from '@/modules/structural-map/domain/types/ModeloTypes';
import styles from './RelationFormPopover.module.css';

type CreateProps = {
  mode: 'create';
  position: ScreenPos;
  sourceEntity: GraphEntity;
  targetEntity: GraphEntity;
  relationTypes: RelationType[];
  onSave: (input: {
    source_entity_id: string;
    target_entity_id: string;
    relation_type_id: string;
    strength: string;
    weight: number;
    description?: string;
  }) => Promise<void>;
  onCancel: () => void;
};

type EditProps = {
  mode: 'edit';
  position: ScreenPos;
  relation: GraphRelation;
  sourceEntity: GraphEntity | undefined;
  targetEntity: GraphEntity | undefined;
  relationTypes: RelationType[];
  onSave: (id: string, patch: {
    relation_type_id?: string;
    strength?: string;
    weight?: number;
    description?: string | null;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCancel: () => void;
};

type Props = CreateProps | EditProps;

function validateWeight(raw: string): number | null {
  const parsed = parseFloat(raw);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) return null;
  return parsed;
}

export function RelationFormPopover(props: Props) {
  const { onCancel, position, relationTypes } = props;
  const isCreate = props.mode === 'create';

  const [typeId, setTypeId] = useState(isCreate ? '' : props.relation.relation_type_id);
  const [strength, setStrength] = useState<string>(isCreate ? 'medium' : (props.relation.strength ?? 'medium'));
  const [weight, setWeight] = useState<string>(isCreate ? '0.5' : String(props.relation.weight ?? 0.5));
  const [description, setDescription] = useState(isCreate ? '' : (props.relation.description ?? ''));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  const selectedType = useMemo(
    () => relationTypes.find((relationType) => relationType.id === typeId) ?? null,
    [relationTypes, typeId],
  );

  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const width = 348;
    const height = 388;
    let left = position.x - width / 2;
    let top = position.y + 22;

    if (typeof window !== 'undefined') {
      if (left < 12) left = 12;
      if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
      if (top + height > window.innerHeight - 12) top = position.y - height - 18;
    }
    setCurrentPos({ x: left, y: top });
  }, [position]);

  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!dragOffsetRef.current) return;
    setCurrentPos({
      x: event.clientX - dragOffsetRef.current.x,
      y: event.clientY - dragOffsetRef.current.y,
    });
  }, []);

  const stopDragging = useCallback(() => {
    dragOffsetRef.current = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopDragging);
  }, [handlePointerMove]);

  const startDragging = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    // Current event is on the header, we want the rect of the whole panel
    const rect = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
  }, [handlePointerMove, stopDragging]);

  const sourceEntity = isCreate ? props.sourceEntity : props.sourceEntity;
  const targetEntity = isCreate ? props.targetEntity : props.targetEntity;
  const strengthStyle = STRENGTH_STYLE[strength as keyof typeof STRENGTH_STYLE] ?? STRENGTH_STYLE.medium;

  async function handleSave() {
    if (!typeId) {
      setError('Selecciona un tipo de relación.');
      return;
    }

    const normalizedWeight = validateWeight(weight);
    if (normalizedWeight === null) {
      setError('El peso debe estar entre 0 y 1.');
      return;
    }

    if (!STRENGTH_OPTIONS.includes(strength as typeof STRENGTH_OPTIONS[number])) {
      setError('La fuerza seleccionada no es válida.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (isCreate) {
        await props.onSave({
          source_entity_id: props.sourceEntity.id,
          target_entity_id: props.targetEntity.id,
          relation_type_id: typeId,
          strength,
          weight: normalizedWeight,
          description: description.trim() || undefined,
        });
      } else {
        await props.onSave(props.relation.id, {
          relation_type_id: typeId,
          strength,
          weight: normalizedWeight,
          description: description.trim() || null,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar la relación.');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (isCreate) return;
    if (!window.confirm('¿Eliminar esta relación?')) return;

    setDeleting(true);
    try {
      await props.onDelete(props.relation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible eliminar la relación.');
      setDeleting(false);
    }
  }

  return (
    <div
      className={styles.panel}
      style={{ left: currentPos.x, top: currentPos.y }}
      onClick={(event) => event.stopPropagation()}
    >
      <div 
        className={styles.header} 
        onPointerDown={startDragging}
        style={{ cursor: 'grab' }}
      >
        <div>
          <p className={styles.eyebrow}>{isCreate ? 'Nueva relación' : 'Editar relación'}</p>
          <h3 className={styles.title}>Definir propiedades</h3>
        </div>
        <button type="button" className={styles.closeButton} onClick={onCancel}>
          ✕
        </button>
      </div>

      <div className={styles.connectionStrip}>
        <span className={styles.entityTag}>{sourceEntity?.name ?? 'Origen'}</span>
        <span className={styles.connectionArrow}>→</span>
        <span className={styles.entityTag}>{targetEntity?.name ?? 'Destino'}</span>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span className={styles.label}>Tipo de relación *</span>
          <select
            ref={firstFieldRef}
            className={styles.input}
            value={typeId}
            onChange={(event) => setTypeId(event.target.value)}
          >
            <option value="">— seleccionar —</option>
            {relationTypes.map((relationType) => (
              <option key={relationType.id} value={relationType.id}>
                {relationType.name} ({relationType.code})
              </option>
            ))}
          </select>
        </label>

        <div className={styles.field}>
          <span className={styles.label}>Fuerza *</span>
          <div className={styles.strengthGrid}>
            {STRENGTH_OPTIONS.map((option) => {
              const optionStyle = STRENGTH_STYLE[option];
              const selected = option === strength;
              return (
                <button
                  key={option}
                  type="button"
                  className={selected ? styles.strengthButtonActive : styles.strengthButton}
                  style={{
                    borderColor: selected ? optionStyle.color : undefined,
                    color: selected ? optionStyle.color : undefined,
                    background: selected ? `${optionStyle.color}14` : undefined,
                  }}
                  onClick={() => setStrength(option)}
                >
                  {optionStyle.label}
                </button>
              );
            })}
          </div>
          <div className={styles.strengthPreview}>
            <div
              className={styles.strengthLine}
              style={{
                background: strengthStyle.color,
                height: `${Math.max(strengthStyle.width, 1)}px`,
              }}
            />
            <span className={styles.helpText}>La línea se dibujará con esta intensidad visual.</span>
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Peso *</span>
          <input
            type="number"
            min="0"
            max="1"
            step="0.05"
            className={styles.input}
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Descripción / justificación</span>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Opcional"
            rows={3}
          />
        </label>
      </div>

      {selectedType && (
        <div className={styles.metaNote}>
          {selectedType.is_directional ? 'Relación dirigida: la flecha representará la dirección estructural.' : 'Relación no dirigida: la línea se mostrará sin flecha.'}
        </div>
      )}

      {error && <p className={styles.errorText}>{error}</p>}

      <div className={styles.footer}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>
          Cancelar
        </button>
        {!isCreate && (
          <button type="button" className={styles.dangerButton} onClick={() => void handleDelete()} disabled={deleting}>
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </button>
        )}
        <button type="button" className={styles.primaryButton} onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Guardando…' : isCreate ? 'Guardar relación' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

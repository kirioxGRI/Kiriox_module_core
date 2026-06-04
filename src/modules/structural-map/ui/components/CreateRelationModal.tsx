'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Link2, X } from 'lucide-react';
import type { GraphEntity } from '@/modules/structural-map/domain/types/GraphTypes';
import type { CreateRelationInput, RelationType } from '@/modules/structural-map/domain/types/PortfolioTypes';
import styles from './CreateRelationModal.module.css';

type Position = { x: number; y: number };

type Props = {
  open: boolean;
  source: GraphEntity | null;
  target: GraphEntity | null;
  relationTypes: RelationType[];
  initialPosition: Position | null;
  onClose: () => void;
  onSubmit: (input: CreateRelationInput) => Promise<void>;
};

const STRENGTH_OPTIONS = [
  { value: 'weak', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'strong', label: 'Alta' },
  { value: 'critical', label: 'Crítica' },
];

function clampPosition(position: Position): Position {
  if (typeof window === 'undefined') return position;
  const width = 320;
  const height = 320;
  const maxX = Math.max(12, window.innerWidth - width - 12);
  const maxY = Math.max(12, window.innerHeight - height - 12);
  return {
    x: Math.min(Math.max(12, position.x), maxX),
    y: Math.min(Math.max(12, position.y), maxY),
  };
}

export function CreateRelationModal({
  open,
  source,
  target,
  relationTypes,
  initialPosition,
  onClose,
  onSubmit,
}: Props) {
  const [relationTypeId, setRelationTypeId] = useState('');
  const [strength, setStrength] = useState('medium');
  const [weight, setWeight] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState<Position>({ x: 140, y: 180 });

  useEffect(() => {
    if (!open) return;
    setRelationTypeId('');
    setStrength('medium');
    setWeight('');
    setError('');
    setPosition(clampPosition(initialPosition ?? { x: 140, y: 180 }));
  }, [initialPosition, open]);

  const sortedRelationTypes = useMemo(
    () => [...relationTypes].sort((left, right) => left.name.localeCompare(right.name)),
    [relationTypes]
  );

  const canSubmit = Boolean(source && target && relationTypeId);

  const handleSubmit = useCallback(async () => {
    if (!source || !target || !relationTypeId) return;
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        source_entity_id: source.id,
        target_entity_id: target.id,
        relation_type_id: relationTypeId,
        strength,
        weight: weight ? Number(weight) : undefined,
      });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo crear la relación');
    } finally {
      setSubmitting(false);
    }
  }, [onClose, onSubmit, relationTypeId, source, strength, target, weight]);

  if (!open || !source || !target) return null;

  return (
    <div className={styles.shell}>
      <div className={styles.window} style={{ left: position.x, top: position.y }}>
        <div className={styles.header}>
          <span className={styles.title}>Crear relación</span>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar modal">
            <X size={14} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.routePills}>
            <span className={styles.pill}>
              <Link2 size={12} />
              {source.code}
            </span>
            <span className={styles.pill}>
              <ArrowRight size={12} />
              {target.code}
            </span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Tipo de relación</label>
            <select value={relationTypeId} onChange={(event) => setRelationTypeId(event.target.value)} className={styles.select}>
              <option value="">— seleccionar —</option>
              {sortedRelationTypes.map((relationType) => (
                <option key={relationType.id} value={relationType.id}>
                  {relationType.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>Fuerza</label>
              <select value={strength} onChange={(event) => setStrength(event.target.value)} className={styles.select}>
                {STRENGTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Peso</label>
              <input
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="Ej. 75"
                className={styles.input}
              />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="button" className={styles.primary} onClick={() => void handleSubmit()} disabled={submitting || !canSubmit}>
              {submitting ? 'Creando…' : 'Crear relación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

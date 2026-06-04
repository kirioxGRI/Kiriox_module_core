'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GripHorizontal, Plus, X } from 'lucide-react';
import type { CreateEntityInput, EntityType } from '@/modules/structural-map/domain/types/PortfolioTypes';
import styles from './CreateEntityModal.module.css';

type Position = { x: number; y: number };

type Props = {
  open: boolean;
  entityTypes: EntityType[];
  initialPosition: Position | null;
  onClose: () => void;
  onSubmit: (input: CreateEntityInput) => Promise<void>;
};

const CRIT_LEVELS = ['critical', 'high', 'medium', 'low'];
const WINDOW_WIDTH = 360;
const WINDOW_HEIGHT = 520;

function generateUniqueHexCode(): string {
  const timePart = Date.now().toString(16).slice(-6);
  const randomPart = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return (timePart + randomPart).toUpperCase();
}

function clampPosition(position: Position): Position {
  if (typeof window === 'undefined') return position;
  const maxX = Math.max(12, window.innerWidth - WINDOW_WIDTH - 12);
  const maxY = Math.max(12, window.innerHeight - WINDOW_HEIGHT - 12);
  return {
    x: Math.min(Math.max(12, position.x), maxX),
    y: Math.min(Math.max(12, position.y), maxY),
  };
}

export function CreateEntityModal({ open, entityTypes, initialPosition, onClose, onSubmit }: Props) {
  const [position, setPosition] = useState<Position>({ x: 80, y: 120 });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [typeId, setTypeId] = useState('');
  const [code, setCode] = useState(generateUniqueHexCode());
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [criticality, setCriticality] = useState('medium');

  const dragOffsetRef = useRef<Position | null>(null);

  useEffect(() => {
    if (!open) return;
    const nextPosition = clampPosition(initialPosition ?? { x: 96, y: 132 });
    setPosition(nextPosition);
    setTypeId('');
    setCode(generateUniqueHexCode());
    setName('');
    setDescription('');
    setCriticality('medium');
    setError('');
  }, [initialPosition, open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, open]);

  const canSubmit = useMemo(() => Boolean(typeId && code && name.trim()), [typeId, code, name]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!dragOffsetRef.current) return;
    setPosition(
      clampPosition({
        x: event.clientX - dragOffsetRef.current.x,
        y: event.clientY - dragOffsetRef.current.y,
      })
    );
  }, []);

  const stopDragging = useCallback(() => {
    dragOffsetRef.current = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopDragging);
  }, [handlePointerMove]);

  const startDragging = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
  }, [handlePointerMove, stopDragging]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setCreating(true);
    setError('');
    try {
      await onSubmit({
        entity_type_id: typeId,
        code,
        name: name.trim(),
        description: description.trim() || undefined,
        criticality_level: criticality,
      });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo crear la entidad');
    } finally {
      setCreating(false);
    }
  }, [canSubmit, code, criticality, description, name, onClose, onSubmit, typeId]);

  if (!open) return null;

  return (
    <div className={styles.shell}>
      <div className={styles.window} style={{ left: position.x, top: position.y }}>
        <div className={styles.header} onPointerDown={startDragging}>
          <span className={styles.title}>Crear entidad</span>
          <div className={styles.headerActions}>
            <span className={styles.iconButton} aria-hidden="true">
              <GripHorizontal size={14} />
            </span>
            <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Cerrar modal">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label className={styles.label}>Tipo</label>
            <select value={typeId} onChange={(event) => setTypeId(event.target.value)} className={styles.select}>
              <option value="">— seleccionar —</option>
              {entityTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Código (Autogenerado)</label>
            <input value={code} readOnly className={`${styles.input} ${styles.inputReadonly}`} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Nombre</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre de la entidad"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Descripción</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Opcional"
              className={styles.textarea}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Criticidad</label>
            <select value={criticality} onChange={(event) => setCriticality(event.target.value)} className={styles.select}>
              {CRIT_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={onClose} disabled={creating}>
              Cancelar
            </button>
            <button type="button" className={styles.primary} onClick={() => void handleSubmit()} disabled={creating || !canSubmit}>
              <Plus size={15} /> {creating ? 'Creando…' : 'Crear entidad'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

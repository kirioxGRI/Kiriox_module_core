'use client';

import type { ScreenPos } from '@/modules/structural-map/domain/types/ModeloTypes';
import styles from './ModelCanvas.module.css';

const HANDLE_OFFSETS = [
  { x: 0, y: -54 },
  { x: 54, y: 0 },
  { x: 0, y: 54 },
  { x: -54, y: 0 },
];

export function RelationHandleOverlay({
  screenPos,
  onPointerDown,
}: {
  screenPos: ScreenPos;
  onPointerDown: (mousePos: ScreenPos) => void;
}) {
  return (
    <div
      className={styles.handleOverlay}
      style={{ left: screenPos.x, top: screenPos.y }}
    >
      {HANDLE_OFFSETS.map((offset, index) => (
        <button
          key={`${offset.x}-${offset.y}-${index}`}
          type="button"
          className={styles.handleButton}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onPointerDown({ x: event.clientX, y: event.clientY });
          }}
          title="Arrastrar para crear relación"
        >
          +
        </button>
      ))}
    </div>
  );
}

export function NodeToolsOverlay({
  screenPos,
  nodeId,
  onDelete,
  onAnalyze,
  onPickEntity,
}: {
  screenPos: ScreenPos;
  nodeId: string;
  onDelete?: (entityId: string) => void;
  onAnalyze?: (entityId: string) => void;
  onPickEntity?: (entityId: string) => void;
}) {
  return (
    <div className={styles.toolsOverlay} style={{ left: screenPos.x, top: screenPos.y }}>
      <span className={styles.toolsHint}>Doble clic para editar entidad</span>
      <div className={styles.toolsRail}>
        {onPickEntity && (
          <button type="button" className={styles.toolButton} onClick={() => onPickEntity(nodeId)}>
            ⊕ Entidad existente
          </button>
        )}
        {onAnalyze && (
          <button type="button" className={styles.toolButton} onClick={() => onAnalyze(nodeId)}>
            ⚡ Analizar
          </button>
        )}
        {onDelete && (
          <button type="button" className={styles.toolButtonDanger} onClick={() => onDelete(nodeId)}>
            ✕ Remover
          </button>
        )}
      </div>
    </div>
  );
}

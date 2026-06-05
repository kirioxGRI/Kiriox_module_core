'use client';

import type { ScreenPos } from '@/modules/structural-map/domain/types/ModeloTypes';
import { PlusCircle, Copy, Zap, Trash2, Link2 } from 'lucide-react';
import styles from './ModelCanvas.module.css';

export function NodeToolsOverlay({
  screenPos,
  nodeId,
  onDelete,
  onAnalyze,
  onPickEntity,
  onDuplicate,
  onRelationStart,
}: {
  screenPos: ScreenPos;
  nodeId: string;
  onDelete?: (entityId: string) => void;
  onAnalyze?: (entityId: string) => void;
  onPickEntity?: (entityId: string) => void;
  onDuplicate?: (entityId: string) => void;
  onRelationStart?: (mousePos: ScreenPos) => void;
}) {
  return (
    <div className={styles.toolsOverlay} style={{ left: screenPos.x, top: screenPos.y }}>
      <div className={styles.contextMenu}>
        {onRelationStart && (
          <button 
            type="button" 
            className={styles.contextMenuItem} 
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRelationStart({ x: event.clientX, y: event.clientY });
            }}
            title="Mantén pulsado y arrastra hacia otro nodo para conectarlos"
          >
            <Link2 size={14} /> Conectar (arrastrar)
          </button>
        )}
        {onPickEntity && (
          <button type="button" className={styles.contextMenuItem} onClick={() => onPickEntity(nodeId)} title="Asociar entidad existente">
            <PlusCircle size={14} /> Asociar existente
          </button>
        )}
        {onDuplicate && (
          <button type="button" className={styles.contextMenuItem} onClick={() => onDuplicate(nodeId)} title="Duplicar entidad">
            <Copy size={14} /> Duplicar entidad
          </button>
        )}
        {onAnalyze && (
          <button type="button" className={styles.contextMenuItem} onClick={() => onAnalyze(nodeId)} title="Analizar dependencias con Motores Elena">
            <Zap size={14} /> Analizar dependencias
          </button>
        )}
        {onDelete && (
          <button type="button" className={styles.contextMenuItemDanger} onClick={() => onDelete(nodeId)} title="Eliminar entidad">
            <Trash2 size={14} /> Eliminar
          </button>
        )}
      </div>
    </div>
  );
}

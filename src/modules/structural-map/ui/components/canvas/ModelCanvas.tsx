'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { GraphEntity, GraphRelation } from '@/modules/structural-map/domain/types/GraphTypes';
import type { CanvasState, ScreenPos } from '@/modules/structural-map/domain/types/ModeloTypes';
import { STRENGTH_STYLE } from '@/modules/structural-map/domain/types/ModeloTypes';

const POS_KEY = 'kiriox-node-positions';

const TYPE_COLORS: Record<string, string> = {
  SERVICE: '#6366f1', PROCESS: '#14b8a6', APPLICATION: '#3b82f6',
  SYSTEM: '#8b5cf6', SUPPLIER: '#f59e0b', RISK: '#ef4444',
  CONTROL: '#22c55e', OBLIGATION: '#ec4899', CONTRACT: '#06b6d4',
  DATA: '#a78bfa', EVIDENCE: '#84cc16', INCIDENT: '#f43f5e',
  DEFAULT: '#64748b',
};

function nodeColor(e: GraphEntity): string {
  if (e.is_critical_node) return '#f87171';
  if (e.is_spof)          return '#fb923c';
  return TYPE_COLORS[e.entity_type_code] ?? TYPE_COLORS.DEFAULT;
}

function loadPositions(): Record<string, { x: number; y: number }> {
  try { return JSON.parse(localStorage.getItem(POS_KEY) ?? '{}') as Record<string, { x: number; y: number }>; }
  catch { return {}; }
}

function savePosition(id: string, pos: { x: number; y: number }) {
  const all = loadPositions();
  all[id] = pos;
  try { localStorage.setItem(POS_KEY, JSON.stringify(all)); } catch { /* noop */ }
}

type Props = {
  entities:      GraphEntity[];
  relations:     GraphRelation[];
  canvasState:   CanvasState;
  onNodeClick:   (entity: GraphEntity, renderedPos: ScreenPos) => void;
  onNodeDblClick:(entity: GraphEntity) => void;
  onEdgeClick:   (relation: GraphRelation) => void;
  onCanvasClick: (screenPos: ScreenPos, graphPos: { x: number; y: number }) => void;
  onMouseMove:   (pos: ScreenPos) => void;
  onNodeDragStart:(nodeId: string) => void;
  onNodeDragEnd: (nodeId: string, graphPos: { x: number; y: number }) => void;
  onRelationHandleClick: (sourceId: string) => void;
  onTargetSelected:      (targetId: string) => void;
  onPanZoom:             () => void;
  onZoomChange?:         (zoom: number) => void;
  onNodeEdit?:           (entityId: string) => void;
  onNodeDelete?:         (entityId: string) => void;
  onNodeAnalyze?:        (entityId: string) => void;
  onNodePickEntity?:     (entityId: string) => void;
  cyRef: React.MutableRefObject<cytoscape.Core | null>;
};

export default function ModelCanvas({
  entities, relations, canvasState,
  onNodeClick, onNodeDblClick, onEdgeClick, onCanvasClick, onMouseMove,
  onNodeDragStart, onNodeDragEnd, onRelationHandleClick, onTargetSelected, onPanZoom, onZoomChange,
  onNodeEdit, onNodeDelete, onNodeAnalyze, onNodePickEntity, cyRef,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const entityMapRef  = useRef(new Map<string, GraphEntity>());
  const relationMapRef = useRef(new Map<string, GraphRelation>());

  entityMapRef.current  = new Map(entities.map((e) => [e.id, e]));
  relationMapRef.current = new Map(relations.map((r) => [r.id, r]));

  const buildElements = useCallback(() => {
    const saved = loadPositions();
    const nodes = entities.map((e) => {
      const pos = saved[e.id];
      return { data: {
        id: e.id, label: e.name ?? e.code,
        color: nodeColor(e), size: e.id.length > 0 && e.is_critical_node ? 48 : 38,
        border: e.is_critical_node ? '#f87171' : e.is_spof ? '#fb923c' : 'transparent',
      }, position: pos ?? undefined };
    });
    const edges = relations.map((r) => {
      const s = (r.strength ?? 'medium') as keyof typeof STRENGTH_STYLE;
      const st = STRENGTH_STYLE[s] ?? STRENGTH_STYLE.medium;
      return { data: {
        id: r.id, source: r.source_entity_id, target: r.target_entity_id,
        label: r.relation_type_code, lineColor: st.color, lineWidth: st.width,
        arrow: r.is_directional ? 'triangle' : 'none',
      }};
    });
    return [...nodes, ...edges];
  }, [entities, relations]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cy: cytoscape.Core;
    void (async () => {
      const [{ default: cytoscape }, { default: fcose }] = await Promise.all([
        import('cytoscape'), import('cytoscape-fcose'),
      ]);
      if (!(cytoscape.prototype as { _hasInitModelo?: boolean })._hasInitModelo) {
        cytoscape.use(fcose);
        (cytoscape.prototype as { _hasInitModelo?: boolean })._hasInitModelo = true;
      }
      cyRef.current?.destroy();

      const hasSaved = Object.keys(loadPositions()).length > 0;
      cy = cytoscape({
        container: containerRef.current!,
        elements:  buildElements(),
        style: [
          { selector: 'node', style: {
            'background-color': 'data(color)', width: 'data(size)', height: 'data(size)',
            label: 'data(label)', color: '#f1f5f9', 'font-size': '10px', 'font-weight': '600',
            'text-valign': 'bottom', 'text-halign': 'center', 'text-margin-y': 6,
            'text-max-width': '90px', 'text-wrap': 'wrap',
            'border-width': 2, 'border-color': 'data(border)', 'overlay-opacity': 0,
          } as unknown as cytoscape.Css.Node },
          { selector: 'edge', style: {
            'line-color': 'data(lineColor)', 'target-arrow-color': 'data(lineColor)',
            'target-arrow-shape': 'data(arrow)' as never, 'curve-style': 'bezier',
            width: 'data(lineWidth)', opacity: 0.8,
            'font-size': '8px', color: '#94a3b8', 'text-rotation': 'autorotate',
            'overlay-opacity': 0,
          } as unknown as cytoscape.Css.Edge },
          { selector: 'node.selected', style: {
            'border-width': 3, 'border-color': '#a5f3fc', 'background-opacity': 0.95,
          } as unknown as cytoscape.Css.Node },
          { selector: 'node.relation-target', style: {
            'border-width': 2, 'border-color': '#fbbf24', 'border-style': 'dashed',
          } as unknown as cytoscape.Css.Node },
          { selector: 'node.relation-source', style: {
            'border-width': 3, 'border-color': '#6366f1',
          } as unknown as cytoscape.Css.Node },
        ],
        layout: hasSaved
          ? { name: 'preset' as never, fit: false }
          : { name: 'fcose' as never, quality: 'default' as never, randomize: true, animate: true, animationDuration: 600, nodeSeparation: 90, idealEdgeLength: 130, fit: false } as never,
        userZoomingEnabled: true, userPanningEnabled: true, boxSelectionEnabled: false, wheelSensitivity: 0.3,
      });

      cy.on('tap', 'node', (evt) => {
        const id = evt.target.id() as string;
        const entity = entityMapRef.current.get(id);
        if (!entity) return;
        const rp = evt.target.renderedPosition() as ScreenPos;
        const r = containerRef.current?.getBoundingClientRect();
        const screenPos: ScreenPos = { x: (r?.left ?? 0) + rp.x, y: (r?.top ?? 0) + rp.y };
        if (canvasState.mode === 'creating_relation' && canvasState.pendingSourceId && canvasState.pendingSourceId !== id) {
          onTargetSelected(id);
        } else {
          onNodeClick(entity, screenPos);
        }
      });

      cy.on('dbltap', 'node', (evt) => {
        const id = evt.target.id() as string;
        const entity = entityMapRef.current.get(id);
        if (entity) onNodeDblClick(entity);
      });

      cy.on('tap', 'edge', (evt) => {
        const id = evt.target.id() as string;
        const rel = relationMapRef.current.get(id);
        if (rel) onEdgeClick(rel);
      });

      cy.on('tap', (evt) => {
        if (evt.target !== cy) return;
        const gp = evt.position as { x: number; y: number };
        const r  = containerRef.current?.getBoundingClientRect();
        const rp = evt.renderedPosition as { x: number; y: number };
        const sp: ScreenPos = { x: (r?.left ?? 0) + rp.x, y: (r?.top ?? 0) + rp.y };
        onCanvasClick(sp, gp);
      });

      cy.on('mousemove', (evt) => {
        const r  = containerRef.current?.getBoundingClientRect();
        const rp = evt.renderedPosition as { x: number; y: number };
        onMouseMove({ x: (r?.left ?? 0) + rp.x, y: (r?.top ?? 0) + rp.y });
      });

      cy.on('grab', 'node', (evt) => { onNodeDragStart(evt.target.id() as string); });
      cy.on('free',  'node', (evt) => {
        const id  = evt.target.id() as string;
        const pos = evt.target.position() as { x: number; y: number };
        savePosition(id, pos);
        onNodeDragEnd(id, pos);
      });

      cy.on('pan zoom', () => {
        onPanZoom();
        if (onZoomChange) onZoomChange(parseFloat(cy.zoom().toFixed(2)));
      });

      // El canvas siempre abre en 150% centrado, una vez estabilizado el layout
      const applyInitialView = () => {
        cy.resize();        // releer dimensiones reales del contenedor antes de centrar
        cy.zoom(1.5);
        cy.center();        // centra el bounding box del grafo en el viewport
      };
      cy.one('layoutstop', () => { requestAnimationFrame(applyInitialView); });
      // Respaldo: si el contenedor aún no tenía tamaño al estabilizar el layout
      setTimeout(() => { if (cyRef.current === cy) applyInitialView(); }, 700);

      cyRef.current = cy;
    })();
    return () => { cy?.destroy(); cyRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities.length, relations.length]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass('selected relation-source relation-target');
    if (canvasState.selectedNodeId) cy.getElementById(canvasState.selectedNodeId).addClass('selected');
    if (canvasState.pendingSourceId) {
      cy.getElementById(canvasState.pendingSourceId).addClass('relation-source');
      cy.nodes().not(`#${canvasState.pendingSourceId}`).addClass('relation-target');
    }
  }, [canvasState.selectedNodeId, canvasState.pendingSourceId, cyRef]);

  const nodeActionPos = canvasState.nodeRenderedPos;
  const sourcePos     = canvasState.pendingSourceId && cyRef.current
    ? (() => {
        const rp = cyRef.current.getElementById(canvasState.pendingSourceId).renderedPosition() as ScreenPos;
        const r  = containerRef.current?.getBoundingClientRect();
        return { x: (r?.left ?? 0) + rp.x, y: (r?.top ?? 0) + rp.y };
      })()
    : null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: 'transparent' }} />

      {/* Ghost line during creating_relation */}
      {canvasState.mode === 'creating_relation' && sourcePos && canvasState.mousePos && (
        <svg style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
          <line
            x1={sourcePos.x} y1={sourcePos.y}
            x2={canvasState.mousePos.x} y2={canvasState.mousePos.y}
            stroke="rgba(99,102,241,0.8)" strokeWidth="2"
            strokeDasharray="8,4" markerEnd="url(#arrow)"
          />
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="rgba(99,102,241,0.8)" />
            </marker>
          </defs>
        </svg>
      )}

      {/* Relation mode hint */}
      {canvasState.mode === 'creating_relation' && (
        <div style={{ position: 'absolute', top: '0.75rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.45)', borderRadius: 20, padding: '0.3rem 0.9rem', color: '#a5b4fc', fontSize: '0.72rem', fontWeight: 700, pointerEvents: 'none', zIndex: 20, whiteSpace: 'nowrap' }}>
          Selecciona un nodo destino · <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.3rem', borderRadius: 4, fontSize: '0.65rem' }}>Esc</kbd> para cancelar
        </div>
      )}

      {/* Node action menu (relation, edit, delete, analyze) */}
      {canvasState.mode === 'node_selected' && nodeActionPos && canvasState.selectedNodeId && (
        <NodeActionOverlay
          screenPos={nodeActionPos}
          nodeId={canvasState.selectedNodeId}
          onRelationHandle={onRelationHandleClick}
          onEdit={onNodeEdit}
          onDelete={onNodeDelete}
          onAnalyze={onNodeAnalyze}
          onPickEntity={onNodePickEntity}
        />
      )}
    </div>
  );
}

type OverlayProps = {
  screenPos: ScreenPos;
  nodeId: string;
  onRelationHandle:  (id: string) => void;
  onEdit?:           (id: string) => void;
  onDelete?:         (id: string) => void;
  onAnalyze?:        (id: string) => void;
  onPickEntity?:     (id: string) => void;
};

function ActionBtn({ onClick, title, color, children }: { onClick: () => void; title: string; color: string; children: React.ReactNode }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      style={{
        width: 26, height: 26, borderRadius: '50%',
        border: `2px solid ${color}99`,
        background: 'rgba(8,12,30,0.95)', color,
        fontSize: '0.78rem', fontWeight: 900, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'auto', transition: 'background 0.15s, transform 0.1s',
        boxShadow: '0 2px 10px rgba(0,0,0,0.55)',
      }}
    >{children}</button>
  );
}

function NodeActionOverlay({ screenPos, nodeId, onRelationHandle, onEdit, onDelete, onAnalyze, onPickEntity }: OverlayProps) {
  const R = 44;
  const D = Math.round(R * 0.7071); // diagonal offset for 45° positions
  return (
    <div style={{ position: 'fixed', left: screenPos.x, top: screenPos.y, transform: 'translate(-50%, -50%)', zIndex: 40, pointerEvents: 'none' }}>
      {/* Top — Crear relación */}
      <div style={{ position: 'absolute', left: '50%', top: -(R + 2), transform: 'translateX(-50%)' }}>
        <ActionBtn onClick={() => onRelationHandle(nodeId)} title="Crear relación" color="#a5b4fc">+</ActionBtn>
      </div>
      {/* Top-right diagonal — Agregar entidad existente */}
      <div style={{ position: 'absolute', left: D + 6, top: -(D + 6), transform: 'translate(-50%, -50%)' }}>
        <ActionBtn onClick={() => onPickEntity?.(nodeId)} title="Agregar entidad existente" color="#38bdf8">⊕</ActionBtn>
      </div>
      {/* Right — Editar */}
      <div style={{ position: 'absolute', left: R + 2, top: '50%', transform: 'translateY(-50%)' }}>
        <ActionBtn onClick={() => onEdit?.(nodeId)} title="Editar entidad (doble clic)" color="#fbbf24">✎</ActionBtn>
      </div>
      {/* Bottom — Eliminar */}
      <div style={{ position: 'absolute', left: '50%', top: R + 2, transform: 'translateX(-50%)' }}>
        <ActionBtn onClick={() => onDelete?.(nodeId)} title="Eliminar entidad" color="#f87171">✕</ActionBtn>
      </div>
      {/* Left — Analizar */}
      <div style={{ position: 'absolute', left: -(R + 28), top: '50%', transform: 'translateY(-50%)' }}>
        <ActionBtn onClick={() => onAnalyze?.(nodeId)} title="Ejecutar análisis desde este nodo" color="#4ade80">⚡</ActionBtn>
      </div>
    </div>
  );
}

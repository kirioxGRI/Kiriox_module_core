'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { GraphEntity, GraphRelation } from '@/modules/structural-map/domain/types/GraphTypes';
import type { CanvasState, ScreenPos } from '@/modules/structural-map/domain/types/ModeloTypes';
import { STRENGTH_STYLE } from '@/modules/structural-map/domain/types/ModeloTypes';
import { NodeToolsOverlay } from '@/modules/structural-map/ui/components/canvas/ModelCanvasOverlays';
import { resolveEntityColor, type EntityColorMap } from '@/modules/structural-map/ui/colors/entityColors';
import styles from './ModelCanvas.module.css';

const POS_KEY = 'kiriox-node-positions';

/** Un nodo crítico o SPOF se resalta con un "glow breathing" (resplandor que late), sin cambiar su color de tipo. */
function needsAttention(entity: GraphEntity): boolean {
  return Boolean(entity.is_critical_node) || Boolean(entity.is_spof);
}

/** Animación de respiración continua del resplandor exterior sobre los nodos con clase `.attention`. */
function startBreathingPulse(cy: cytoscape.Core): void {
  const breathe = (ele: cytoscape.NodeSingular) => {
    if (cy.destroyed() || ele.removed()) return;
    ele.animate(
      { style: { 'overlay-opacity': 0.4, 'overlay-padding': 16 } },
      {
        duration: 800,
        easing: 'ease-in-out-sine' as never,
        complete: () => {
          if (cy.destroyed() || ele.removed()) return;
          ele.animate(
            { style: { 'overlay-opacity': 0.1, 'overlay-padding': 4 } },
            {
              duration: 800,
              easing: 'ease-in-out-sine' as never,
              complete: () => breathe(ele),
            },
          );
        },
      },
    );
  };
  cy.nodes('.attention').forEach((ele) => breathe(ele as cytoscape.NodeSingular));
}

function loadPositions(): Record<string, { x: number; y: number }> {
  try {
    return JSON.parse(localStorage.getItem(POS_KEY) ?? '{}') as Record<string, { x: number; y: number }>;
  } catch {
    return {};
  }
}

function savePosition(id: string, pos: { x: number; y: number }) {
  const all = loadPositions();
  all[id] = pos;
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(all));
  } catch {
    // noop
  }
}

type Props = {
  entities: GraphEntity[];
  relations: GraphRelation[];
  canvasState: CanvasState;
  colorMap: EntityColorMap;
  onNodeClick: (entity: GraphEntity, renderedPos: ScreenPos) => void;
  onNodeContextMenu: (entity: GraphEntity, renderedPos: ScreenPos) => void;
  onNodeDblClick: (entity: GraphEntity) => void;
  onEdgeDblClick: (relation: GraphRelation, screenPos: ScreenPos) => void;
  onCanvasClick: (screenPos: ScreenPos, graphPos: { x: number; y: number }) => void;
  onCanvasContextMenu?: (screenPos: ScreenPos, graphPos: { x: number; y: number }) => void;
  onMouseMove: (pos: ScreenPos) => void;
  onNodeDragStart: (nodeId: string) => void;
  onNodeDragEnd: (nodeId: string, graphPos: { x: number; y: number }) => void;
  onRelationStart: (sourceId: string, mousePos: ScreenPos) => void;
  onRelationHoverChange: (targetId: string | null) => void;
  onTargetSelected: (targetId: string) => void;
  onRelationCancel: () => void;
  onPanZoom: () => void;
  onZoomChange?: (zoom: number) => void;
  onNodeDelete?: (entityId: string) => void;
  onNodeAnalyze?: (entityId: string) => void;
  onNodePickEntity?: (entityId: string) => void;
  onNodeDuplicate?: (entityId: string) => void;
  cyRef: React.MutableRefObject<cytoscape.Core | null>;
};

export default function ModelCanvas({
  entities,
  relations,
  canvasState,
  colorMap,
  onNodeClick,
  onNodeContextMenu,
  onNodeDblClick,
  onEdgeDblClick,
  onCanvasClick,
  onCanvasContextMenu,
  onMouseMove,
  onNodeDragStart,
  onNodeDragEnd,
  onRelationStart,
  onRelationHoverChange,
  onTargetSelected,
  onRelationCancel,
  onPanZoom,
  onZoomChange,
  onNodeDelete,
  onNodeAnalyze,
  onNodePickEntity,
  onNodeDuplicate,
  cyRef,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const entityMapRef = useRef(new Map<string, GraphEntity>());
  const relationMapRef = useRef(new Map<string, GraphRelation>());

  entityMapRef.current = new Map(entities.map((entity) => [entity.id, entity]));
  relationMapRef.current = new Map(relations.map((relation) => [relation.id, relation]));

  const buildElements = useCallback(() => {
    const saved = loadPositions();
    const nodes = entities.map((entity) => {
      const pos = saved[entity.id];
      const attention = needsAttention(entity);
      return {
        data: {
          id: entity.id,
          label: entity.name ?? entity.code,
          color: resolveEntityColor(entity.entity_type_code, colorMap),
          size: entity.is_critical_node ? 48 : 38,
          border: 'transparent',
        },
        classes: attention ? 'attention' : '',
        position: pos ?? undefined,
      };
    });

    const edges = relations.map((relation) => {
      const strength = (relation.strength ?? 'medium') as keyof typeof STRENGTH_STYLE;
      const style = STRENGTH_STYLE[strength] ?? STRENGTH_STYLE.medium;
      return {
        data: {
          id: relation.id,
          source: relation.source_entity_id,
          target: relation.target_entity_id,
          label: relation.relation_type_code,
          lineColor: style.color,
          lineWidth: style.width,
          arrow: relation.is_directional ? 'triangle' : 'none',
        },
      };
    });

    return [...nodes, ...edges];
  }, [entities, relations, colorMap]);

  const getContainerRect = useCallback(() => containerRef.current?.getBoundingClientRect(), []);

  const getNodeScreenPos = useCallback((nodeId: string): ScreenPos | null => {
    const node = cyRef.current?.getElementById(nodeId);
    const rect = getContainerRect();
    if (!node || !rect || node.empty()) return null;

    const rendered = node.renderedPosition() as ScreenPos;
    return { x: rect.left + rendered.x, y: rect.top + rendered.y };
  }, [cyRef, getContainerRect]);

  const findTargetNodeAtScreenPos = useCallback((screenPos: ScreenPos, sourceId: string): string | null => {
    const cy = cyRef.current;
    const rect = getContainerRect();
    if (!cy || !rect) return null;

    const canvasX = screenPos.x - rect.left;
    const canvasY = screenPos.y - rect.top;

    for (const node of cy.nodes()) {
      const nodeId = node.id();
      if (nodeId === sourceId) continue;

      const box = node.renderedBoundingBox({ includeLabels: false, includeOverlays: false });
      if (canvasX >= box.x1 && canvasX <= box.x2 && canvasY >= box.y1 && canvasY <= box.y2) {
        return nodeId;
      }
    }

    return null;
  }, [cyRef, getContainerRect]);

  useEffect(() => {
    const preventNativeMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    document.addEventListener('contextmenu', preventNativeMenu, { capture: true });
    return () => document.removeEventListener('contextmenu', preventNativeMenu, { capture: true });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    let cy: cytoscape.Core | undefined;

    void (async () => {
      const [{ default: cytoscape }, { default: fcose }] = await Promise.all([
        import('cytoscape'),
        import('cytoscape-fcose'),
      ]);

      if (!(cytoscape.prototype as { _hasInitModelo?: boolean })._hasInitModelo) {
        cytoscape.use(fcose);
        (cytoscape.prototype as { _hasInitModelo?: boolean })._hasInitModelo = true;
      }

      cyRef.current?.destroy();

      const hasSaved = Object.keys(loadPositions()).length > 0;
      cy = cytoscape({
        container: containerRef.current!,
        elements: buildElements(),
        style: [
          {
            selector: 'node',
            style: {
              'background-color': 'data(color)',
              width: 'data(size)',
              height: 'data(size)',
              label: 'data(label)',
              color: '#f8fafc',
              'font-size': '10px',
              'font-weight': '600',
              'text-valign': 'bottom',
              'text-halign': 'center',
              'text-margin-y': 6,
              'text-max-width': '90px',
              'text-wrap': 'wrap',
              'border-width': 2,
              'border-color': 'data(border)',
              'overlay-opacity': 0,
            } as unknown as cytoscape.Css.Node,
          },
          {
            selector: 'edge',
            style: {
              'line-color': 'data(lineColor)',
              'target-arrow-color': 'data(lineColor)',
              'target-arrow-shape': 'data(arrow)' as never,
              'curve-style': 'bezier',
              width: 'data(lineWidth)',
              opacity: 0.9,
              'arrow-scale': 0.55,
              'font-size': '8px',
              color: '#94a3b8',
              'text-rotation': 'autorotate',
              'text-margin-y': -7,
              'overlay-opacity': 0.18,
              'overlay-padding': 6,
            } as unknown as cytoscape.Css.Edge,
          },
          {
            selector: 'node.attention',
            style: {
              'overlay-color': 'data(color)',
              'overlay-shape': 'ellipse',
              'overlay-opacity': 0.18,
              'overlay-padding': 6,
            } as unknown as cytoscape.Css.Node,
          },
          {
            selector: 'node.selected',
            style: {
              'border-width': 3,
              'border-color': '#a5f3fc',
              'background-opacity': 0.98,
            } as unknown as cytoscape.Css.Node,
          },
          {
            selector: 'node.relation-source',
            style: {
              'border-width': 3,
              'border-color': '#818cf8',
            } as unknown as cytoscape.Css.Node,
          },
          {
            selector: 'node.relation-target-candidate',
            style: {
              'border-width': 2,
              'border-color': '#38bdf8',
              'border-style': 'dashed',
              'background-opacity': 0.92,
            } as unknown as cytoscape.Css.Node,
          },
          {
            selector: 'node.relation-hover-target',
            style: {
              'border-width': 4,
              'border-color': '#fbbf24',
              'background-blacken': -0.08,
            } as unknown as cytoscape.Css.Node,
          },
          {
            selector: 'edge.selected',
            style: {
              width: 7,
              'line-color': '#a5f3fc',
              'target-arrow-color': '#a5f3fc',
              'arrow-scale': 0.85,
              opacity: 1,
            } as unknown as cytoscape.Css.Edge,
          },
        ],
        layout: hasSaved
          ? { name: 'preset' as never, fit: false }
          : {
              name: 'fcose' as never,
              quality: 'default' as never,
              randomize: true,
              animate: true,
              animationDuration: 600,
              nodeSeparation: 90,
              idealEdgeLength: 130,
              fit: false,
            } as never,
        userZoomingEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: false,
        wheelSensitivity: 0.3,
      });

      cy.on('tap', 'node', (evt) => {
        if (canvasState.mode === 'creating_relation') return;

        const nodeId = evt.target.id() as string;
        const entity = entityMapRef.current.get(nodeId);
        if (!entity) return;

        const rendered = evt.target.renderedPosition() as ScreenPos;
        const rect = getContainerRect();
        const screenPos: ScreenPos = { x: (rect?.left ?? 0) + rendered.x, y: (rect?.top ?? 0) + rendered.y };
        onNodeClick(entity, screenPos);
      });

      cy.on('cxttap', 'node', (evt) => {
        if (canvasState.mode === 'creating_relation') return;

        const nodeId = evt.target.id() as string;
        const entity = entityMapRef.current.get(nodeId);
        if (!entity) return;

        const rendered = evt.target.renderedPosition() as ScreenPos;
        const rect = getContainerRect();
        const screenPos: ScreenPos = { x: (rect?.left ?? 0) + rendered.x, y: (rect?.top ?? 0) + rendered.y };
        onNodeContextMenu(entity, screenPos);
      });

      cy.on('dbltap', 'node', (evt) => {
        const nodeId = evt.target.id() as string;
        const entity = entityMapRef.current.get(nodeId);
        if (entity) onNodeDblClick(entity);
      });

      cy.on('dbltap', 'edge', (evt) => {
        const edgeId = evt.target.id() as string;
        const relation = relationMapRef.current.get(edgeId);
        if (!relation) return;

        const midpoint = evt.target.renderedMidpoint() as ScreenPos;
        const rect = getContainerRect();
        const screenPos: ScreenPos = { x: (rect?.left ?? 0) + midpoint.x, y: (rect?.top ?? 0) + midpoint.y };
        onEdgeDblClick(relation, screenPos);
      });

      cy.on('tap', (evt) => {
        if (evt.target !== cy || canvasState.mode === 'creating_relation' || canvasState.mode === 'editing_relation') return;

        const graphPos = evt.position as { x: number; y: number };
        const rendered = evt.renderedPosition as { x: number; y: number };
        const rect = getContainerRect();
        const screenPos: ScreenPos = { x: (rect?.left ?? 0) + rendered.x, y: (rect?.top ?? 0) + rendered.y };
        onCanvasClick(screenPos, graphPos);
      });

      cy.on('cxttap', (evt) => {
        if (evt.target !== cy || canvasState.mode === 'creating_relation' || canvasState.mode === 'editing_relation') return;

        const graphPos = evt.position as { x: number; y: number };
        const rendered = evt.renderedPosition as { x: number; y: number };
        const rect = getContainerRect();
        const screenPos: ScreenPos = { x: (rect?.left ?? 0) + rendered.x, y: (rect?.top ?? 0) + rendered.y };
        onCanvasContextMenu?.(screenPos, graphPos);
      });

      cy.on('mousemove', (evt) => {
        const rect = getContainerRect();
        const rendered = evt.renderedPosition as { x: number; y: number };
        onMouseMove({ x: (rect?.left ?? 0) + rendered.x, y: (rect?.top ?? 0) + rendered.y });
      });

      cy.on('grab', 'node', (evt) => {
        onNodeDragStart(evt.target.id() as string);
      });

      cy.on('free', 'node', (evt) => {
        const nodeId = evt.target.id() as string;
        const pos = evt.target.position() as { x: number; y: number };
        savePosition(nodeId, pos);
        onNodeDragEnd(nodeId, pos);
      });

      cy.on('pan zoom', () => {
        onPanZoom();
        onZoomChange?.(parseFloat(cy!.zoom().toFixed(2)));
      });

      const applyInitialView = () => {
        cy?.resize();
        cy?.zoom(0.8);
        cy?.center();
        onZoomChange?.(0.8);
      };

      cy.one('layoutstop', () => {
        requestAnimationFrame(applyInitialView);
      });

      setTimeout(() => {
        if (cyRef.current === cy) applyInitialView();
      }, 700);

      // Glow breathing: los nodos crítico/SPOF laten suavemente para guiar la mirada.
      startBreathingPulse(cy);

      cyRef.current = cy;
    })();

    return () => {
      cy?.destroy();
      cyRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildElements]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.nodes().removeClass('selected relation-source relation-target-candidate relation-hover-target');
    cy.edges().removeClass('selected');

    if (canvasState.selectedNodeId) {
      cy.getElementById(canvasState.selectedNodeId).addClass('selected');
    }

    if (canvasState.selectedEdgeId) {
      cy.getElementById(canvasState.selectedEdgeId).addClass('selected');
    }

    if (canvasState.pendingSourceId) {
      cy.getElementById(canvasState.pendingSourceId).addClass('relation-source');
      cy.nodes().not(`#${canvasState.pendingSourceId}`).addClass('relation-target-candidate');
    }

    if (canvasState.hoverTargetId) {
      cy.getElementById(canvasState.hoverTargetId).addClass('relation-hover-target');
    }
  }, [canvasState.hoverTargetId, canvasState.pendingSourceId, canvasState.selectedEdgeId, canvasState.selectedNodeId, cyRef]);

  useEffect(() => {
    if (canvasState.mode !== 'creating_relation' || !canvasState.pendingSourceId) return;

    const sourceId = canvasState.pendingSourceId;

    const handlePointerMove = (event: PointerEvent) => {
      const nextPos = { x: event.clientX, y: event.clientY };
      onMouseMove(nextPos);
      onRelationHoverChange(findTargetNodeAtScreenPos(nextPos, sourceId));
    };

    const handlePointerUp = (event: PointerEvent) => {
      const nextPos = { x: event.clientX, y: event.clientY };
      const targetId = findTargetNodeAtScreenPos(nextPos, sourceId);
      onRelationHoverChange(null);
      if (targetId) {
        onTargetSelected(targetId);
        return;
      }
      onRelationCancel();
    };

    window.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('pointerup', handlePointerUp, true);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', handlePointerUp, true);
    };
  }, [canvasState.mode, canvasState.pendingSourceId, findTargetNodeAtScreenPos, onMouseMove, onRelationCancel, onRelationHoverChange, onTargetSelected]);

  const sourcePos = useMemo(() => {
    if (!canvasState.pendingSourceId) return null;
    return getNodeScreenPos(canvasState.pendingSourceId);
  }, [canvasState.pendingSourceId, getNodeScreenPos]);

  const overlayNodeId = canvasState.selectedNodeId;
  const overlayScreenPos = canvasState.nodeRenderedPos;

  const showHandles = overlayNodeId && overlayScreenPos && canvasState.mode !== 'creating_relation' && canvasState.mode !== 'editing_relation';
  const showNodeTools = canvasState.mode === 'node_context_menu' && canvasState.selectedNodeId === overlayNodeId && overlayScreenPos;

  return (
    <div className={styles.root}>
      <div
        ref={containerRef}
        className={canvasState.mode === 'creating_relation' ? styles.canvasRelationMode : styles.canvas}
      />

      {canvasState.mode === 'creating_relation' && sourcePos && canvasState.mousePos && (
        <svg className={styles.ghostSvg}>
          <defs>
            <marker
              id="kiriox-qbe-arrow"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L6,3 z" fill="rgba(56,189,248,0.92)" />
            </marker>
          </defs>
          <line
            className={styles.ghostLine}
            x1={sourcePos.x}
            y1={sourcePos.y}
            x2={canvasState.mousePos.x}
            y2={canvasState.mousePos.y}
            markerEnd="url(#kiriox-qbe-arrow)"
          />
        </svg>
      )}

      {canvasState.mode === 'creating_relation' && (
        <div className={styles.relationHint}>
          Arrastra hasta un nodo destino válido y suelta para definir la relación. <kbd>Esc</kbd> cancela.
        </div>
      )}

      {/* Relation handles removed in favor of context menu option */}

      {showNodeTools && overlayNodeId && overlayScreenPos && (
        <NodeToolsOverlay
          screenPos={overlayScreenPos}
          nodeId={overlayNodeId}
          onDelete={onNodeDelete}
          onAnalyze={onNodeAnalyze}
          onPickEntity={onNodePickEntity}
          onDuplicate={onNodeDuplicate}
          onRelationStart={(mousePos) => onRelationStart(overlayNodeId, mousePos)}
        />
      )}
    </div>
  );
}

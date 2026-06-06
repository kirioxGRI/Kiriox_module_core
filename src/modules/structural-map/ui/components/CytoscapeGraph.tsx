'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { SubgraphData, GraphEntity, GraphRelation } from '@/modules/structural-map/domain/types/GraphTypes';
import { resolveEntityColor, useEntityColors } from '@/modules/structural-map/ui/colors/entityColors';

type Props = {
  data: SubgraphData;
  rootEntityId: string;
  selectedNodeId: string | null;
  highlightedIds?: Set<string>;
  linkMode?: boolean;
  dragLinkSourceId?: string | null;
  pickRelationSourceMode?: boolean;
  onNodeClick: (entity: GraphEntity) => void;
  onEdgeClick: (relation: GraphRelation) => void;
  onNodeSecondaryAction?: (
    entity: GraphEntity,
    position: { x: number; y: number; renderedX: number; renderedY: number }
  ) => void;
  onCanvasContextMenu?: (position: { x: number; y: number; renderedX: number; renderedY: number }) => void;
  onDragLink?: (sourceId: string, targetId: string) => void;
  onRelationSourcePick?: (entity: GraphEntity) => void;
  onSelectedNodeAnchorChange?: (anchor: { x: number; y: number } | null) => void;
  onZoomChange?: (zoom: number) => void;
};

function edgeColor(code: string): string {
  const map: Record<string, string> = {
    DEPENDS_ON: '#f87171',
    RISK:       '#f87171',
    MITIGATES:  '#22c55e',
    CONTROLS:   '#22c55e',
    SUPPORTS:   '#60a5fa',
    PROVIDES:   '#a78bfa',
    USES:       '#94a3b8',
  };
  return map[code] ?? '#475569';
}

export default function CytoscapeGraph({
  data,
  rootEntityId,
  selectedNodeId,
  highlightedIds,
  linkMode,
  dragLinkSourceId,
  pickRelationSourceMode,
  onNodeClick,
  onEdgeClick,
  onNodeSecondaryAction,
  onCanvasContextMenu,
  onDragLink,
  onRelationSourcePick,
  onSelectedNodeAnchorChange,
  onZoomChange,
}: Props) {
  const colorMap = useEntityColors();
  const containerRef   = useRef<HTMLDivElement>(null);
  const cyRef          = useRef<cytoscape.Core | null>(null);
  const [cyReadyKey, setCyReadyKey] = useState(0);
  const entityMapRef   = useRef<Map<string, GraphEntity>>(new Map());
  const relationMapRef = useRef<Map<string, GraphRelation>>(new Map());
  const linkSourceRef  = useRef<string | null>(null);
  const dragSourceRef  = useRef<string | null>(null);
  const hoveredNodeIdRef = useRef<string | null>(null);

  entityMapRef.current   = new Map(data.entities.map((e) => [e.id, e]));
  relationMapRef.current = new Map(data.relations.map((r) => [r.id, r]));

  const buildElements = useCallback(() => {
    const nodes = data.entities.map((e) => ({
      data: {
        id:    e.id,
        label: e.name ?? e.code,
        color: resolveEntityColor(e.entity_type_code, colorMap),
        size:  e.id === rootEntityId ? 3 : e.is_critical_node ? 2.5 : e.is_spof ? 2 : 1.5,
        border: e.id === rootEntityId ? '#ffffff' : e.is_critical_node ? '#f87171' : e.is_spof ? '#fb923c' : 'transparent',
      },
    }));
    const edges = data.relations.map((r) => ({
      data: {
        id:     r.id,
        source: r.source_entity_id,
        target: r.target_entity_id,
        label:  r.relation_type_code,
        color:  edgeColor(r.relation_type_code),
        arrow:  r.is_directional ? 'triangle' : 'none',
      },
    }));
    return [...nodes, ...edges];
  }, [data, rootEntityId, colorMap]);

  const emitZoomPercent = useCallback((zoom: number) => {
    if (!onZoomChange) return;
    onZoomChange(Math.max(1, Math.round(zoom * 100)));
  }, [onZoomChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    let cy: cytoscape.Core;

    void (async () => {
      const [{ default: cytoscape }, { default: fcose }] = await Promise.all([
        import('cytoscape'),
        import('cytoscape-fcose'),
      ]);

      if (!cytoscape.prototype.hasInitialised) {
        cytoscape.use(fcose);
        cytoscape.prototype.hasInitialised = true;
      }

      if (cyRef.current) { cyRef.current.destroy(); }

      cy = cytoscape({
        container: containerRef.current!,
        elements:  buildElements(),
        style: [
          {
            selector: 'node',
            style: {
              'background-color':    'transparent',
              'width':               'data(size)',
              'height':              'data(size)',
              'label':               'data(label)',
              'color':               '#f1f5f9',
              'font-size':           '1px',
              'font-weight':         '600',
              'text-valign':         'bottom',
              'text-halign':         'center',
              'text-margin-y':       1,
              'text-max-width':      '40px',
              'text-wrap':           'wrap',
              'border-width':        0.15,
              'border-color':        'transparent',
              'overlay-opacity':     0,
              'transition-property': 'border-color, border-width, opacity',
              'transition-duration': '0.15s',
            } as unknown as cytoscape.Css.Node,
          },
          {
            selector: 'node[color]',
            style: {
              'background-color': 'data(color)',
            } as unknown as cytoscape.Css.Node,
          },
          {
            selector: 'node[border]',
            style: {
              'border-color': 'data(border)',
            } as unknown as cytoscape.Css.Node,
          },
          {
            selector: 'edge',
            style: {
              'line-color':          'data(color)',
              'target-arrow-color':  'data(color)',
              'target-arrow-shape':  'data(arrow)' as never,
              'curve-style':         'bezier',
              'width':               0.2,
              'arrow-scale':         0.22,
              'opacity':             0.7,
              'font-size':           '7px',
              'color':               '#94a3b8',
              'text-rotation':       'autorotate',
              'overlay-opacity':     0,
            } as unknown as cytoscape.Css.Edge,
          },
          {
            selector: 'node:selected',
            style: { 'border-width': 0.3, 'border-color': '#a5f3fc', 'background-opacity': 0.9 } as unknown as cytoscape.Css.Node,
          },
          {
            selector: 'edge:selected',
            style: { 'width': 0.6, 'arrow-scale': 0.3, 'opacity': 1, 'line-color': '#e2e8f0', 'target-arrow-color': '#e2e8f0' } as unknown as cytoscape.Css.Edge,
          },
          {
            selector: '.link-source',
            style: {
              'border-width': 0.3,
              'border-color': '#34d399',
              'background-opacity': 0.95,
            } as unknown as cytoscape.Css.Node,
          },
          {
            selector: '.link-ghost',
            style: {
              'line-color': '#34d399',
              'line-style': 'solid',
              'width': 0.5,
              'opacity': 0.95,
              'target-arrow-shape': 'none',
              'curve-style': 'straight',
            } as unknown as cytoscape.Css.Edge,
          },
          {
            selector: '.ghost-target',
            style: {
              'width': 0.1,
              'height': 0.1,
              'opacity': 0,
              'label': '',
            } as unknown as cytoscape.Css.Node,
          },
        ],
        layout: {
          name:            'fcose' as never,
          quality:         'default' as never,
          randomize:       true,
          animate:         true,
          animationDuration: 800,
          nodeSeparation:  60,
          idealEdgeLength: 100,
        } as never,
        userZoomingEnabled:   true,
        userPanningEnabled:   true,
        boxSelectionEnabled:  false,
        wheelSensitivity:     0.3,
      });

      /* ─── Standard node click ─── */
      cy.on('tap', 'node', (evt) => {
        const id     = evt.target.id() as string;
        const entity = entityMapRef.current.get(id);
        if (entity) onNodeClick(entity);
      });

      /* ─── Right-click on node (secondary action / link mode pick) ─── */
      cy.on('cxttap', 'node', (evt) => {
        evt.originalEvent?.preventDefault();
        const id = evt.target.id() as string;
        const entity = entityMapRef.current.get(id);
        if (entity && onNodeSecondaryAction) {
          const pos = evt.position;
          const rpos = evt.renderedPosition;
          onNodeSecondaryAction(entity, {
            x: pos.x,
            y: pos.y,
            renderedX: rpos.x,
            renderedY: rpos.y,
          });
        }
      });

      /* ─── Right-click on empty canvas ─── */
      cy.on('cxttap', (evt) => {
        evt.originalEvent?.preventDefault();
        if (evt.target === cy && onCanvasContextMenu) {
          const pos = evt.position;
          const rpos = evt.renderedPosition;
          onCanvasContextMenu({
            x: pos.x,
            y: pos.y,
            renderedX: rpos.x,
            renderedY: rpos.y,
          });
        }
      });

      /* ─── Edge click ─── */
      cy.on('tap', 'edge', (evt) => {
        const id       = evt.target.id() as string;
        const relation = relationMapRef.current.get(id);
        if (relation) onEdgeClick(relation);
      });

      cy.on('mouseover', 'node', (evt) => {
        hoveredNodeIdRef.current = evt.target.id() as string;
      });

      cy.on('mouseout', 'node', (evt) => {
        if (hoveredNodeIdRef.current === (evt.target.id() as string)) {
          hoveredNodeIdRef.current = null;
        }
      });

      /* ─── Block native browser context menu on Cytoscape container ─── */
      if (cy.container()) {
        cy.container()!.addEventListener('contextmenu', (e) => {
          e.preventDefault();
        });
      }

      cyRef.current = cy;
      setCyReadyKey((current) => current + 1);

      emitZoomPercent(cy.zoom());
    })();

    return () => { cy?.destroy(); cyRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.entities.length, data.relations.length, emitZoomPercent, rootEntityId]);

  /* ─── Link-mode interaction ─── */
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    if (!linkMode) {
      linkSourceRef.current = null;
      cy.nodes().removeClass('link-source');
      cy.edges('.link-ghost').remove();
      cy.userPanningEnabled(true);
      cy.nodes().ungrabify();
      cy.nodes().grabify();
      return;
    }

    cy.nodes().ungrabify();

    const handler = (evt: cytoscape.EventObject) => {
      const id = evt.target.id() as string;

      if (!linkSourceRef.current) {
        linkSourceRef.current = id;
        cy.nodes().removeClass('link-source');
        evt.target.addClass('link-source');
      } else if (linkSourceRef.current !== id) {
        const srcId = linkSourceRef.current;
        cy.nodes().removeClass('link-source');
        cy.edges('.link-ghost').remove();
        linkSourceRef.current = null;
        if (onDragLink) onDragLink(srcId, id);
      }
    };

    cy.on('tap', 'node', handler);
    return () => {
      cy.off('tap', 'node', handler);
      cy.nodes().removeClass('link-source');
      cy.edges('.link-ghost').remove();
      cy.nodes().grabify();
      linkSourceRef.current = null;
    };
  }, [linkMode, onDragLink]);

  /* ─── Drag-link interaction with visible ghost line ─── */
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const removeGhost = () => {
      cy.nodes().removeClass('link-source');
      if (cy.getElementById('__ghost_target__').nonempty()) cy.getElementById('__ghost_target__').remove();
      if (cy.getElementById('__ghost_edge__').nonempty()) cy.getElementById('__ghost_edge__').remove();
    };

    const startGhost = (sourceId: string) => {
      const sourceNode = cy.getElementById(sourceId);
      if (!sourceNode || sourceNode.empty()) return;
      removeGhost();
      dragSourceRef.current = sourceId;
      sourceNode.addClass('link-source');
      const pos = sourceNode.position();
      cy.add([
        {
          group: 'nodes',
          data: { id: '__ghost_target__', color: 'transparent', size: 0.1, border: 'transparent', label: '' },
          position: { x: pos.x, y: pos.y },
          classes: 'ghost-target',
        },
        {
          group: 'edges',
          data: { id: '__ghost_edge__', source: sourceId, target: '__ghost_target__' },
          classes: 'link-ghost',
        },
      ]);
    };

    const updateGhostPosition = (evt: cytoscape.EventObject) => {
      if (!dragSourceRef.current) return;
      const ghostNode = cy.getElementById('__ghost_target__');
      if (!ghostNode || ghostNode.empty()) return;
      if (evt.position) {
        ghostNode.position({ x: evt.position.x, y: evt.position.y });
      }
    };

    const finishGhost = () => {
      const sourceId = dragSourceRef.current;
      const hoveredId = hoveredNodeIdRef.current;
      removeGhost();
      dragSourceRef.current = null;
      if (sourceId && hoveredId && hoveredId !== sourceId && onDragLink) {
        onDragLink(sourceId, hoveredId);
      }
    };

    const cancelGhost = () => {
      removeGhost();
      dragSourceRef.current = null;
    };

    if (dragLinkSourceId) {
      startGhost(dragLinkSourceId);
    } else if (!pickRelationSourceMode) {
      cancelGhost();
    }

    const handleNodePointerDown = (evt: cytoscape.EventObject) => {
      if (!pickRelationSourceMode) return;
      evt.originalEvent?.preventDefault();
      const id = evt.target.id() as string;
      const entity = entityMapRef.current.get(id);
      if (entity && onRelationSourcePick) onRelationSourcePick(entity);
      startGhost(id);
    };

    const handlePointerUp = () => {
      if (dragSourceRef.current) finishGhost();
    };

    cy.on('mousemove', updateGhostPosition);
    cy.on('mousedown', 'node', handleNodePointerDown);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      cy.off('mousemove', updateGhostPosition);
      cy.off('mousedown', 'node', handleNodePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      if (!dragLinkSourceId) cancelGhost();
    };
  }, [dragLinkSourceId, onDragLink, onRelationSourcePick, pickRelationSourceMode]);

  /* ─── Selection & highlight styling ─── */
  useEffect(() => {
    if (!cyRef.current) return;
    cyRef.current.nodes().forEach((n) => {
      const id = n.id();
      if (selectedNodeId && id === selectedNodeId) {
        n.style('border-width', 0.3);
        n.style('border-color', '#a5f3fc');
      } else if (highlightedIds?.has(id)) {
        n.style('opacity', 1);
        n.style('border-color', '#fbbf24');
        n.style('border-width', 0.2);
      } else if (highlightedIds && highlightedIds.size > 0) {
        n.style('opacity', 0.3);
      } else {
        n.style('opacity', 1);
        n.style('border-color', n.data('border') as string);
        n.style('border-width', 0.15);
      }
    });
  }, [selectedNodeId, highlightedIds]);

  /* ─── Emit selected node rendered anchor to parent for overlay actions ─── */
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || (!onSelectedNodeAnchorChange && !onZoomChange)) return;

    const emitViewport = () => {
      emitZoomPercent(cy.zoom());

      if (onSelectedNodeAnchorChange) {
        if (!selectedNodeId) {
          onSelectedNodeAnchorChange(null);
          return;
        }
        const node = cy.getElementById(selectedNodeId);
        if (!node || node.empty()) {
          onSelectedNodeAnchorChange(null);
          return;
        }
        const pos = node.renderedPosition();
        onSelectedNodeAnchorChange({ x: pos.x, y: pos.y });
      }
    };

    emitViewport();
    cy.on('pan zoom resize render layoutstop', emitViewport);

    return () => {
      cy.off('pan zoom resize render layoutstop', emitViewport);
    };
  }, [cyReadyKey, data.entities.length, data.relations.length, emitZoomPercent, onSelectedNodeAnchorChange, selectedNodeId]);

  /* ─── Global context menu blocker ─── */
  useEffect(() => {
    // Escudo definitivo: interceptar en la fase de captura a nivel de todo el documento
    const preventNativeMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    
    document.addEventListener('contextmenu', preventNativeMenu, { capture: true });
    
    return () => {
      document.removeEventListener('contextmenu', preventNativeMenu, { capture: true });
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: 'transparent', cursor: linkMode ? 'crosshair' : 'default' }}
    />
  );
}

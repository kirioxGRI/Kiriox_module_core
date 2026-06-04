'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { SubgraphData, GraphEntity, GraphRelation } from '@/modules/structural-map/domain/types/GraphTypes';

type Props = {
  data: SubgraphData;
  rootEntityId: string;
  selectedNodeId: string | null;
  highlightedIds?: Set<string>;
  onNodeClick: (entity: GraphEntity) => void;
  onEdgeClick: (relation: GraphRelation) => void;
  onEdgeCreate?: (sourceId: string, targetId: string) => void;
};

const TYPE_COLORS: Record<string, string> = {
  SERVICE:     '#6366f1',
  PROCESS:     '#14b8a6',
  APPLICATION: '#3b82f6',
  SYSTEM:      '#8b5cf6',
  SUPPLIER:    '#f59e0b',
  RISK:        '#ef4444',
  CONTROL:     '#22c55e',
  OBLIGATION:  '#ec4899',
  CONTRACT:    '#06b6d4',
  DATA:        '#a78bfa',
  EVIDENCE:    '#84cc16',
  DEFAULT:     '#64748b',
};

function nodeColor(entity: GraphEntity): string {
  if (entity.is_critical_node) return '#f87171';
  if (entity.is_spof)          return '#fb923c';
  return TYPE_COLORS[entity.entity_type_code] ?? TYPE_COLORS.DEFAULT;
}

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

export default function CytoscapeGraph({ data, rootEntityId, selectedNodeId, highlightedIds, onNodeClick, onEdgeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef        = useRef<cytoscape.Core | null>(null);
  const entityMapRef = useRef<Map<string, GraphEntity>>(new Map());
  const relationMapRef = useRef<Map<string, GraphRelation>>(new Map());

  entityMapRef.current = new Map(data.entities.map((e) => [e.id, e]));
  relationMapRef.current = new Map(data.relations.map((r) => [r.id, r]));

  const buildElements = useCallback(() => {
    const nodes = data.entities.map((e) => ({
      data: {
        id:    e.id,
        label: e.name ?? e.code,
        color: nodeColor(e),
        size:  e.id === rootEntityId ? 55 : e.is_critical_node ? 45 : e.is_spof ? 42 : 35,
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
  }, [data, rootEntityId]);

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
              'background-color':    'data(color)',
              'width':               'data(size)',
              'height':              'data(size)',
              'label':               'data(label)',
              'color':               '#f1f5f9',
              'font-size':           '10px',
              'font-weight':         '600',
              'text-valign':         'bottom',
              'text-halign':         'center',
              'text-margin-y':       6,
              'text-max-width':      '90px',
              'text-wrap':           'wrap',
              'border-width':        2,
              'border-color':        'data(border)',
              'overlay-opacity':     0,
            } as unknown as cytoscape.Css.Node,
          },
          {
            selector: 'edge',
            style: {
              'line-color':          'data(color)',
              'target-arrow-color':  'data(color)',
              'target-arrow-shape':  'data(arrow)' as never,
              'curve-style':         'bezier',
              'width':               1.5,
              'opacity':             0.7,
              'font-size':           '8px',
              'color':               '#94a3b8',
              'text-rotation':       'autorotate',
              'overlay-opacity':     0,
            } as unknown as cytoscape.Css.Edge,
          },
          {
            selector: 'node:selected',
            style: { 'border-width': 3, 'border-color': '#a5f3fc', 'background-opacity': 0.9 } as unknown as cytoscape.Css.Node,
          },
          {
            selector: 'edge:selected',
            style: { 'width': 3, 'opacity': 1, 'line-color': '#e2e8f0', 'target-arrow-color': '#e2e8f0' } as unknown as cytoscape.Css.Edge,
          },
        ],
        layout: {
          name:            'fcose' as never,
          quality:         'default' as never,
          randomize:       true,
          animate:         true,
          animationDuration: 800,
          nodeSeparation:  80,
          idealEdgeLength: 120,
        } as never,
        userZoomingEnabled:   true,
        userPanningEnabled:   true,
        boxSelectionEnabled:  false,
        wheelSensitivity:     0.3,
      });

      cy.on('tap', 'node', (evt) => {
        const id     = evt.target.id() as string;
        const entity = entityMapRef.current.get(id);
        if (entity) onNodeClick(entity);
      });

      cy.on('tap', 'edge', (evt) => {
        const id       = evt.target.id() as string;
        const relation = relationMapRef.current.get(id);
        if (relation) onEdgeClick(relation);
      });

      cyRef.current = cy;
    })();

    return () => { cy?.destroy(); cyRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.entities.length, data.relations.length, rootEntityId]);

  useEffect(() => {
    if (!cyRef.current) return;
    cyRef.current.nodes().forEach((n) => {
      const id = n.id();
      if (selectedNodeId && id === selectedNodeId) {
        n.style('border-width', 3);
        n.style('border-color', '#a5f3fc');
      } else if (highlightedIds?.has(id)) {
        n.style('opacity', 1);
        n.style('border-color', '#fbbf24');
        n.style('border-width', 2);
      } else if (highlightedIds && highlightedIds.size > 0) {
        n.style('opacity', 0.3);
      } else {
        n.style('opacity', 1);
        n.style('border-color', n.data('border') as string);
        n.style('border-width', 2);
      }
    });
  }, [selectedNodeId, highlightedIds]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    />
  );
}

'use client';

import React, { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import type { OverviewEdge, OverviewNode } from '@/modules/structural-risk/domain/types/Dashboard2Types';
import type { Dashboard2Layout, Dashboard2Mode } from '@/modules/structural-risk/ui/store/useDashboard2Store';
import styles from './Dashboard2Canvas.module.css';

type CytoscapeCore = import('cytoscape').Core;
type CytoscapeElementDefinition = import('cytoscape').ElementDefinition;

// Obsidian-style: nodos plateados/blancos, hubs más grandes y brillantes
// El color por tipo es sutil — la prominencia viene del tamaño y el glow
const NODE_BASE_COLOR  = 'rgba(192, 200, 220, 0.88)';
const NODE_HUB_COLOR   = 'rgba(220, 230, 255, 0.95)';
const NODE_FOCUS_COLOR = '#7c9cff';
const EDGE_BASE_COLOR  = 'rgba(100, 130, 200, 0.35)';
const EDGE_FOCUS_COLOR = 'rgba(140, 170, 255, 0.85)';

function buildStylesheet(_mode: Dashboard2Mode) {
  return [
    // ── Nodo base ──────────────────────────────────────────────────────
    {
      selector: 'node',
      style: {
        'background-color':  'data(vizColor)',
        width:               'data(vizSize)',
        height:              'data(vizSize)',
        label:               'data(label)',
        color:               'rgba(180, 190, 215, 0.72)',
        'font-size':         9,
        'font-weight':       500,
        'text-wrap':         'ellipsis' as const,
        'text-max-width':    90,
        'text-valign':       'bottom' as const,
        'text-halign':       'center' as const,
        'text-margin-y':     4,
        'border-width':      0,
        'overlay-opacity':   0,
      },
    },
    // ── REINO: círculo ámbar grande con glow ──────────────────────────
    {
      selector: 'node[nodeType ^= "REIN"]',
      style: {
        shape:              'ellipse' as const,
        'background-color': '#f59e0b',
        width:              128,
        height:             128,
        color:              'rgba(255, 237, 180, 0.95)',
        'font-size':        11,
        'font-weight':      700,
        'border-width':     3,
        'border-color':     'rgba(245, 158, 11, 0.55)',
      },
    },
    // ── DOMINIO: triángulo azul ────────────────────────────────────────
    {
      selector: 'node[nodeType ^= "DOM"]:not([nodeType *= "ELEM"])',
      style: {
        shape:              'hexagon' as const,
        'background-color': '#3b82f6',
        width:              46,
        height:             46,
        color:              'rgba(147, 197, 253, 0.9)',
        'font-size':        9,
        'font-weight':      600,
        'border-width':     0,
      },
    },
    // ── ELEMENTO: cuadrado cian ────────────────────────────────────────
    {
      selector: 'node[nodeType *= "ELEM"]',
      style: {
        shape:              'rectangle' as const,
        'background-color': '#06b6d4',
        width:              30,
        height:             30,
        color:              'rgba(103, 232, 249, 0.85)',
        'font-size':        8,
        'font-weight':      500,
        'border-width':     0,
      },
    },
    // ── RIESGO: diamante rojo intenso ─────────────────────────────────
    {
      selector: 'node[nodeType *= "RISK"], node[nodeType *= "RIESG"], node[nodeType *= "INHER"], node[nodeType *= "RESID"]',
      style: {
        shape:              'diamond' as const,
        'background-color': '#ff0000',
        width:              23,
        height:             23,
        color:              '#ffffff',
        'font-size':        8,
        'font-weight':      700,
        'border-width':     2,
        'border-color':     '#ff6666',
        opacity:            1,
      },
    },
    // ── CONTROL: hexágono esmeralda ────────────────────────────────────
    {
      selector: 'node[nodeType *= "CONTROL"]',
      style: {
        shape:              'hexagon' as const,
        'background-color': '#10b981',
        width:              20,
        height:             20,
        color:              '#ffffff',
        'font-size':        8,
        'font-weight':      600,
        'border-width':     1,
        'border-color':     '#34d399',
        opacity:            1,
      },
    },
    // ── Hard gate: borde dorado sutil ──────────────────────────────────
    {
      selector: '.is-hard-gate',
      style: {
        'border-width':  2,
        'border-color':  'rgba(251, 191, 36, 0.55)',
      },
    },
    // ── Nodo foco: glow azul ───────────────────────────────────────────
    {
      selector: '.is-focused',
      style: {
        'background-color': NODE_FOCUS_COLOR,
        color:              'rgba(220, 232, 255, 0.95)',
        'font-size':        10,
        'font-weight':      700,
        'border-width':     2,
        'border-color':     'rgba(107, 140, 255, 0.9)',
      },
    },
    // ── Vecino del foco: más visible ──────────────────────────────────
    {
      selector: '.is-neighbor',
      style: {
        'background-color': NODE_HUB_COLOR,
        opacity:            1,
        'border-width':     1,
        'border-color':     'rgba(140, 170, 255, 0.45)',
      },
    },
    // ── Nodo desvanecido ──────────────────────────────────────────────
    {
      selector: '.is-faded',
      style: {
        opacity:            0.1,
      },
    },
    // ── Arista base ───────────────────────────────────────────────────
    {
      selector: 'edge',
      style: {
        width:                    'data(vizWidth)',
        'curve-style':            'bezier' as const,
        'line-color':             EDGE_BASE_COLOR,
        'target-arrow-shape':     'none' as const,
        'overlay-opacity':        0,
        opacity:                  1,
        label:                    '',           // sin label por defecto
      },
    },
    // ── Arista activa (conectada al foco) ─────────────────────────────
    {
      selector: '.is-active-edge',
      style: {
        'line-color':  EDGE_FOCUS_COLOR,
        width:         2.5,
        opacity:       1,
      },
    },
    // ── Arista desvanecida ────────────────────────────────────────────
    {
      selector: 'edge.is-faded',
      style: {
        opacity: 0.04,
      },
    },
  ];
}

function toVizNode(node: OverviewNode): CytoscapeElementDefinition {
  const degree    = node.total_degree;
  const impact    = node.failure_impact_score;
  const weight    = node.structural_weight;
  const nodeType  = (node.node_type ?? '').toUpperCase();

  // Tamaño base: fijo por tipo jerárquico, variable por conectividad para el resto
  let baseSize: number;
  if      (nodeType.includes('REIN'))                               baseSize = 128;
  else if (nodeType.includes('DOM') && !nodeType.includes('ELEMENT')) baseSize = 46;
  else if (nodeType.includes('ELEM'))                               baseSize = 30;
  else if (nodeType.includes('RISK') || nodeType.includes('RIESG')) baseSize = 23;
  else if (nodeType.includes('CONTROL'))                            baseSize = 20;
  else                                                              baseSize = 9;

  const isHierarchy = nodeType.includes('REIN') || nodeType.includes('DOM') ||
                      nodeType.includes('ELEM') || nodeType.includes('RISK') ||
                      nodeType.includes('RIESG') || nodeType.includes('CONTROL');

  const sizeBoost = isHierarchy ? 0 : degree * 1.6 + impact * 0.18 + weight * 0.12;
  const vizSize   = Math.max(baseSize, Math.min(67, baseSize + sizeBoost)); // techo +15%

  const t        = Math.min(1, degree / 30);
  const vizColor = t > 0.5 ? NODE_HUB_COLOR : NODE_BASE_COLOR;

  return {
    data: {
      id:               node.node_id,
      label:            node.node_name || node.node_code || node.node_id,
      type:             node.node_type,
      nodeType,
      vizColor,
      vizSize,
      failure_impact:   impact,
      total_degree:     degree,
      structural_weight: weight,
      is_hard_gate:     node.is_hard_gate,
      is_dependency_root: node.is_dependency_root,
    },
    classes: node.is_hard_gate ? 'is-hard-gate' : undefined,
  };
}

function toVizEdge(edge: OverviewEdge): CytoscapeElementDefinition {
  return {
    data: {
      id:       edge.edge_id,
      source:   edge.src_node_id,
      target:   edge.dst_node_id,
      vizWidth: Math.max(0.6, Math.min(3, edge.edge_weight * 3)),
    },
  };
}

type Props = {
  nodes: OverviewNode[];
  edges: OverviewEdge[];
  selectedNodeId: string | null;
  layout: Dashboard2Layout;
  mode: Dashboard2Mode;
  rotationSpeed: number;
  onNodeSelect: (id: string | null) => void;
};

export type Dashboard2CanvasHandle = {
  fit: () => void;
  zoomTo: (level: number) => void;
};

export const Dashboard2Canvas = React.forwardRef<Dashboard2CanvasHandle, Props>(function Dashboard2Canvas({
  nodes,
  edges,
  selectedNodeId,
  layout,
  mode,
  rotationSpeed,
  onNodeSelect,
}, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<CytoscapeCore | null>(null);
  const speedRef = useRef<number>(rotationSpeed);
  const [zoomPct, setZoomPct] = useState<number>(100);

  // Sincroniza el ref con el prop sin reiniciar el loop
  useEffect(() => { speedRef.current = rotationSpeed; }, [rotationSpeed]);

  const cyElements = useMemo<CytoscapeElementDefinition[]>(() => {
    const nodeIds = new Set(nodes.map((n) => n.node_id));
    const validEdges = edges.filter(
      (e) => nodeIds.has(e.src_node_id) && nodeIds.has(e.dst_node_id)
    );
    // DEBUG: tipos únicos de nodo en el canvas
    const types = [...new Set(nodes.map((n) => n.node_type))];
    console.log('[Canvas] node_types:', types);
    return [...nodes.map(toVizNode), ...validEdges.map(toVizEdge)];
  }, [nodes, edges]);

  // Build/rebuild Cytoscape when elements or layout change
  useEffect(() => {
    let mounted = true;

    const render = async () => {
      if (!containerRef.current || !cyElements.length) return;

      const cytoscapeImport = (await import('cytoscape')) as any;
      const cytoscape = (cytoscapeImport.default ?? cytoscapeImport) as any;

      // Register fcose once
      if (layout === 'fcose') {
        const fcoseImport = (await import('cytoscape-fcose')) as any;
        const fcose = fcoseImport.default ?? fcoseImport;
        try { cytoscape.use(fcose); } catch { /* already registered */ }
      }

      if (!mounted || !containerRef.current) return;
      cyRef.current?.destroy();

      const layoutConfig: Record<string, any> =
        layout === 'fcose'
          ? {
              name:    'fcose',
              quality: 'default',
              // --- No nodo central, forma emerge por conectividad ---
              randomize:               true,
              animate:                 true,
              animationDuration:       750,
              animationEasing:         'ease-out-cubic',
              fit:                     true,
              padding:                 80,
              nodeDimensionsIncludeLabels: false,
              uniformNodeDimensions:   false,
              packComponents:          true,
              // --- Física de la constelación ---
              gravity:                 0.02,   // gravedad mínima → sin polo central
              gravityRange:            12.0,   // atracción entra muy tarde
              // --- Resortes por arista ---
              idealEdgeLength:         (edge: any) => {
                const w = Number(edge.data('vizWidth') ?? 2);
                return Math.max(320, 560 - w * 20); // mucho más espacio entre nodos hijos
              },
              edgeElasticity:          () => 0.18, // resortes más flojos → clusters más sueltos
              nestingFactor:           0.1,
              // --- Repulsión agresiva entre nodos ---
              nodeRepulsion:           (node: any) => {
                const impact = Number(node.data('failure_impact') ?? 0);
                const degree = Number(node.data('total_degree') ?? 0);
                return 120000 + impact * 600 + degree * 800;
              },
              numIter:                 4000,
              // --- Separación horizontal de grupos ---
              tileDisconnectedNodes:   true,
              tilingPaddingVertical:   100,
              tilingPaddingHorizontal: 260,
              initialEnergyOnIncremental: 0.5,
            }
          : layout === 'circle'
          ? { name: 'circle', animate: true, animationDuration: 500, fit: true, padding: 64, spacingFactor: 1.1 }
          : { name: 'breadthfirst', animate: true, animationDuration: 500, fit: true, padding: 64, directed: true, spacingFactor: 1.55 };

      const cy = cytoscape({
        container: containerRef.current,
        elements:  cyElements,
        layout:    layoutConfig,
        minZoom:   0.05,
        maxZoom:   10,
        style:     buildStylesheet(mode) as any,
      });

      cy.on('tap', 'node', (event: any) => {
        const id = String(event.target.data('id'));
        startTransition(() => onNodeSelect(id));

        cy.elements().removeClass('is-focused is-neighbor is-faded is-active-edge');
        cy.elements().addClass('is-faded');

        const node = event.target;
        // Solo el nodo y su descendencia (sucesores)
        const path = node.add(node.successors());

        path.removeClass('is-faded').addClass('is-neighbor');
        node.removeClass('is-neighbor').addClass('is-focused');

        // Aristas conectadas al camino completo
        path.connectedEdges().removeClass('is-faded').addClass('is-active-edge');
      });

      // --- Comportamiento de arrastre en cascada (arrastra hijos) ---
      cy.on('grabon', 'node', (evt: any) => {
        const node = evt.target;
        // successors() obtiene toda la descendencia recursiva en el grafo dirigido
        node.successors().nodes().select();
      });

      cy.on('free', 'node', (evt: any) => {
        const node = evt.target;
        node.successors().nodes().unselect();
      });

      cy.on('tap', (event: any) => {
        if (event.target !== cy) return;
        startTransition(() => onNodeSelect(null));
        cy.elements().removeClass('is-focused is-neighbor is-faded is-active-edge');
      });

      cyRef.current = cy;

      // ── Zoom inicial + animación 4D ───────────────────────────────────
      cy.one('layoutstop', () => {
        cy.zoom(0.36);
        cy.center();
        setZoomPct(36);

        // Breve delay para que las posiciones del layout se estabilicen
        setTimeout(() => {
          if (!mounted || !cyRef.current) return;

          // 1. Capturar posiciones y normalizar en un radio acotado
          //    para evitar que las aristas se estiren al rotar
          type Vec3 = { x: number; y: number; z: number };
          const orig3D = new Map<string, Vec3>();

          const bb = cy.elements().boundingBox();
          const gcx = (bb.x1 + bb.x2) / 2;
          const gcy = (bb.y1 + bb.y2) / 2;

          // Escalar XY al 55% del layout original → aristas más cortas tras proyección
          const SCALE_XY = 0.55;
          // Z distribuido dentro de ±30% del radio XY máximo
          const maxR = Math.max(bb.w, bb.h) * 0.5 * SCALE_XY;
          const Z_SPREAD = maxR * 0.30;

          cy.nodes().forEach((node: any) => {
            const p = node.position();
            orig3D.set(node.id(), {
              x: (p.x - gcx) * SCALE_XY,
              y: (p.y - gcy) * SCALE_XY,
              z: (Math.random() - 0.5) * 2 * Z_SPREAD,
            });
          });

          // 2. Velocidades base (×10 del original): cada unidad del slider = 1% de velocidad
          const SPD = { XY: 0.0018, XZ: 0.0062, YZ: 0.0041 };
          let aXY = Math.random() * Math.PI * 2;
          let aXZ = Math.random() * Math.PI * 2;
          let aYZ = Math.random() * Math.PI * 2;

          // FOV grande = menos distorsión perspectiva → aristas no se estiran
          const FOV = 2200;

          // Nodos que el usuario está arrastrando — se excluyen del loop
          const dragging = new Set<string>();

          cy.on('grab', 'node', (evt: any) => {
            dragging.add(evt.target.id());
          });

          cy.on('free', 'node', (evt: any) => {
            const id  = evt.target.id();
            const pos = evt.target.position();
            const p   = orig3D.get(id);
            if (!p) { dragging.delete(id); return; }

            // ── Paso 1: obtener z3 real aplicando rotación forward al orig actual ──
            let fx = p.x, fy = p.y, fz = p.z;
            let t1: number, t2: number;

            // XY
            t1 = fx * Math.cos(aXY) - fy * Math.sin(aXY);
            t2 = fx * Math.sin(aXY) + fy * Math.cos(aXY);
            fx = t1; fy = t2;
            // XZ
            t1 = fx * Math.cos(aXZ) - fz * Math.sin(aXZ);
            t2 = fx * Math.sin(aXZ) + fz * Math.cos(aXZ);
            fx = t1; fz = t2;
            // YZ
            t1 = fy * Math.cos(aYZ) - fz * Math.sin(aYZ);
            t2 = fy * Math.sin(aYZ) + fz * Math.cos(aYZ);
            fy = t1; fz = t2;

            const z3 = fz; // profundidad real del nodo en este momento

            // ── Paso 2: des-proyectar la posición de drop usando z3 conocido ──
            const scale = (FOV + z3) / FOV;
            let x = (pos.x - gcx) * scale;
            let y = (pos.y - gcy) * scale;
            let z = z3;

            // ── Paso 3: rotación inversa (orden inverso, ángulos negados) ──
            // -YZ
            t1 = y * Math.cos(-aYZ) - z * Math.sin(-aYZ);
            t2 = y * Math.sin(-aYZ) + z * Math.cos(-aYZ);
            y = t1; z = t2;
            // -XZ
            t1 = x * Math.cos(-aXZ) - z * Math.sin(-aXZ);
            t2 = x * Math.sin(-aXZ) + z * Math.cos(-aXZ);
            x = t1; z = t2;
            // -XY
            t1 = x * Math.cos(-aXY) - y * Math.sin(-aXY);
            t2 = x * Math.sin(-aXY) + y * Math.cos(-aXY);
            x = t1; y = t2;

            orig3D.set(id, { x, y, z });
            dragging.delete(id);
          });

          let paused = false;
          let pauseTimer: ReturnType<typeof setTimeout> | null = null;

          const pause = () => {
            paused = true;
            if (pauseTimer) clearTimeout(pauseTimer);
            pauseTimer = setTimeout(() => { paused = false; }, 2200);
          };
          cy.on('mousedown touchstart', pause);

          let rafId: number;

          const tick = () => {
            // 0–100 → multiplicador lineal: cada unidad = 1% de la velocidad base
            const spd = paused ? 0 : speedRef.current / 100;
            if (spd > 0) {
              aXY += SPD.XY * spd;
              aXZ += SPD.XZ * spd;
              aYZ += SPD.YZ * spd;
            }

            const cXY = Math.cos(aXY), sXY = Math.sin(aXY);
            const cXZ = Math.cos(aXZ), sXZ = Math.sin(aXZ);
            const cYZ = Math.cos(aYZ), sYZ = Math.sin(aYZ);

            cy.batch(() => {
              cy.nodes().positions((node: any) => {
                // No tocar nodos que el usuario está moviendo
                if (dragging.has(node.id())) return node.position();

                const p = orig3D.get(node.id());
                if (!p) return { x: gcx, y: gcy };

                let x = p.x, y = p.y, z = p.z;

                // Rotación XY (giro suave sobre eje Z)
                let nx = x * cXY - y * sXY;
                let ny = x * sXY + y * cXY;
                x = nx; y = ny;

                // Rotación XZ (volteo sobre eje Y — más rápido)
                nx = x * cXZ - z * sXZ;
                let nz = x * sXZ + z * cXZ;
                x = nx; z = nz;

                // Rotación YZ (inclinación sobre eje X)
                ny = y * cYZ - z * sYZ;
                nz = y * sYZ + z * cYZ;
                y = ny; z = nz;

                // Proyección perspectiva 3D → 2D
                const s = FOV / (FOV + z);

                return {
                  x: gcx + x * s,
                  y: gcy + y * s,
                };
              });
            });

            rafId = requestAnimationFrame(tick);
          };

          rafId = requestAnimationFrame(tick);

          (cy as any)._stopAnim = () => {
            cancelAnimationFrame(rafId);
            if (pauseTimer) clearTimeout(pauseTimer);
            cy.off('mousedown touchstart', pause);
          };
        }, 120);
      });

      // Track zoom level
      cy.on('zoom', () => setZoomPct(Math.round(cy.zoom() * 100)));
    };

    render();
    return () => {
      mounted = false;
      if (cyRef.current) {
        (cyRef.current as any)._stopAnim?.();
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [cyElements, layout, mode, onNodeSelect]);

  // Sync external selectedNodeId → canvas highlight
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().removeClass('is-focused is-neighbor is-faded is-active-edge');
    if (!selectedNodeId) return;
    const target = cy.getElementById(selectedNodeId);
    if (!target.length) return;
    cy.elements().addClass('is-faded');
    
    // Solo el nodo y su descendencia para selección externa
    const path = target.add(target.successors());
    
    path.removeClass('is-faded').addClass('is-neighbor');
    target.removeClass('is-neighbor').addClass('is-focused');
    path.connectedEdges().removeClass('is-faded').addClass('is-active-edge');
    
    // Calcular zoom óptimo pero limitado al 75%
    const bb = path.boundingBox();
    const padding = 120;
    const w = cy.width();
    const h = cy.height();
    const zoomX = w / (bb.w + padding);
    const zoomY = h / (bb.h + padding);
    const idealZoom = Math.min(zoomX, zoomY);
    const finalZoom = Math.min(idealZoom, 0.75);

    cy.animate({ 
      zoom: finalZoom,
      center: { eles: path }
    } as any, { duration: 450, easing: 'ease-out-quint' });
  }, [selectedNodeId]);

  // Expose methods to parent
  React.useImperativeHandle(ref, () => ({
    fit: () => {
      cyRef.current?.fit(undefined, 80);
    },
    zoomTo: (level: number) => {
      if (!cyRef.current) return;
      cyRef.current.animate({
        zoom: level,
        center: { eles: cyRef.current.nodes() }
      } as any, { duration: 600, easing: 'ease-out-cubic' });
    }
  }));

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.canvas} />
      <span className={styles.zoomBadge}>{zoomPct}%</span>
    </div>
  );
});

export default Dashboard2Canvas;

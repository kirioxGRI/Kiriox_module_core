'use client';

import React, { useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { OverviewResponse } from '@/modules/structural-risk/domain/types/Dashboard2Types';
import { useDashboard2Store } from '@/modules/structural-risk/ui/store/useDashboard2Store';
import Dashboard2Canvas from '@/modules/structural-risk/ui/components/Dashboard2Canvas';
import Dashboard2Header from '@/modules/structural-risk/ui/components/Dashboard2Header';
import Dashboard2NodePanel from '@/modules/structural-risk/ui/components/Dashboard2NodePanel';
import Dashboard2BottomStrip from '@/modules/structural-risk/ui/components/Dashboard2BottomStrip';
import styles from './Dashboard2Page.module.css';

async function fetchOverview(): Promise<OverviewResponse> {
  const res = await fetch('/api/dashboard2/graph/overview');
  if (!res.ok) throw new Error('Error cargando el grafo');
  return res.json();
}

export default function Dashboard2Page() {
  const canvasRef = useRef<import('@/modules/structural-risk/ui/components/Dashboard2Canvas').Dashboard2CanvasHandle | null>(null);

  const selectedNodeId   = useDashboard2Store((s) => s.selectedNodeId);
  const layout           = useDashboard2Store((s) => s.layout);
  const mode             = useDashboard2Store((s) => s.mode);
  const rightPanelOpen   = useDashboard2Store((s) => s.rightPanelOpen);
  const setSelectedNodeId = useDashboard2Store((s) => s.setSelectedNodeId);
  const nodeFilter       = useDashboard2Store((s) => s.nodeFilter);
  const activeNodeTypes  = useDashboard2Store((s) => s.activeNodeTypes);
  const rotationSpeed    = useDashboard2Store((s) => s.rotationSpeed);
  const setNodeFilter    = useDashboard2Store((s) => s.setNodeFilter);
  const toggleNodeType   = useDashboard2Store((s) => s.toggleNodeType);
  const setRotationSpeed = useDashboard2Store((s) => s.setRotationSpeed);
  const setRightPanelOpen = useDashboard2Store((s) => s.setRightPanelOpen);

  const { data, isLoading, isError, refetch } = useQuery<OverviewResponse>({
    queryKey: ['dashboard2-overview'],
    queryFn:  fetchOverview,
    staleTime: 3 * 60 * 1000,
  });

  const allNodes = data?.nodes ?? [];
  const allEdges = data?.edges ?? [];

  // Filtro Maestro: Reino -> Tipo
  const nodes = useMemo(() => {
    return allNodes.filter((n) => {
      const t = (n.node_type ?? '').toUpperCase();
      
      // 1. Filtro por Reino (Scope)
      let inScope = true;
      if (nodeFilter === 'reino_aml')   inScope = n.reino_code === 'AML' || (n.node_type === 'REINO' && n.node_code === 'AML');
      if (nodeFilter === 'reino_ciber') inScope = n.reino_code === 'CYB' || (n.node_type === 'REINO' && n.node_code === 'CYB');
      
      if (!inScope) return false;

      // 2. Filtro por Tipo de Nodo (Visibility)
      // Mapeamos los IDs de los checkboxes a los tipos reales del backend
      let isActive = true;
      if (t.includes('REIN'))  isActive = activeNodeTypes.includes('REINO');
      if (t.includes('DOM'))   isActive = activeNodeTypes.includes('DOMAIN');
      if (t.includes('ELEM'))  isActive = activeNodeTypes.includes('ELEMENT');
      if (t.includes('RISK') || t.includes('RIESG')) isActive = activeNodeTypes.includes('RISK');
      if (t.includes('CONTROL')) isActive = activeNodeTypes.includes('CONTROL');

      return isActive;
    });
  }, [allNodes, nodeFilter, activeNodeTypes]);

  const edges = useMemo(() => {
    const nodeIds = new Set(nodes.map(n => n.node_id));
    return allEdges.filter(e => nodeIds.has(e.src_node_id) && nodeIds.has(e.dst_node_id));
  }, [allEdges, nodes]);

  const selectedNode = selectedNodeId
    ? allNodes.find((n) => n.node_id === selectedNodeId) ?? null
    : null;

  const handleNodeSelect = useCallback(
    (id: string | null) => setSelectedNodeId(id),
    [setSelectedNodeId]
  );

  const handleClosePanel = () => {
    setSelectedNodeId(null);
    setRightPanelOpen(false);
    // Al cerrar el panel, volvemos al zoom del 36%
    setTimeout(() => {
      canvasRef.current?.zoomTo(0.36);
    }, 100);
  };

  const handleRefresh = () => refetch();

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.glowA} />
      <div className={styles.glowB} />
      <div className={styles.glowC} />

      <div className={styles.content}>
      {/* Zona 1 — Header */}
      <Dashboard2Header
        nodeCount={nodes.length}
        edgeCount={edges.length}
        nodeFilter={nodeFilter}
        activeNodeTypes={activeNodeTypes}
        rotationSpeed={rotationSpeed}
        onFilterChange={setNodeFilter}
        onToggleType={toggleNodeType}
        onToggleFullscreen={handleToggleFullscreen}
        onRefresh={handleRefresh}
        onRotationSpeedChange={setRotationSpeed}
        loading={isLoading}
      />

      {/* Zonas 2 + 3 — Canvas + Panel */}
      <div className={`${styles.workspace} ${rightPanelOpen ? styles.workspaceWithPanel : ''}`}>
        <section className={styles.canvasCard}>
          {isLoading && (
            <div className={styles.canvasOverlay}>
              <div className={styles.spinner} />
              <span>Cargando grafo estructural...</span>
            </div>
          )}
          {isError && (
            <div className={styles.canvasOverlay}>
              <span className={styles.errorMsg}>No se pudo cargar el grafo. Verifica la conexión a la base de datos.</span>
              <button className={styles.retryBtn} onClick={handleRefresh}>Reintentar</button>
            </div>
          )}
          {!isLoading && !isError && (
            <Dashboard2Canvas
              ref={canvasRef}
              nodes={nodes}
              edges={edges}
              selectedNodeId={selectedNodeId}
              layout={layout}
              mode={mode}
              rotationSpeed={rotationSpeed}
              onNodeSelect={handleNodeSelect}
            />
          )}
        </section>

        {/* Zona 3 — Panel lateral */}
        <aside className={`${styles.nodePanel} ${rightPanelOpen ? styles.nodePanelVisible : ''}`}>
          <Dashboard2NodePanel node={selectedNode} onClose={handleClosePanel} />
        </aside>
      </div>

      {/* Zona 4 — Tarjetas ejecutivas */}
      <Dashboard2BottomStrip />
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect, lazy, Suspense, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Network, ChevronLeft, Layers, Shield, AlertTriangle, GitBranch, CheckSquare, Link2, Plus, Trash2, MousePointer2 } from 'lucide-react';
import { usePortfolio } from '@/modules/structural-map/ui/hooks/usePortfolio';
import { useServiceGraph } from '@/modules/structural-map/ui/hooks/useServiceGraph';
import { EntityCatalogPanel } from '@/modules/structural-map/ui/components/EntityCatalogPanel';
import { NodeContextPanel } from '@/modules/structural-map/ui/components/NodeContextPanel';
import { ElenaEngineResultPanel } from '@/modules/structural-map/ui/components/ElenaEngineResultPanel';
import { CreateEntityModal } from '@/modules/structural-map/ui/components/CreateEntityModal';
import { CreateRelationModal } from '@/modules/structural-map/ui/components/CreateRelationModal';
import type { GraphEntity, GraphRelation } from '@/modules/structural-map/domain/types/GraphTypes';
import type { CreateEntityInput } from '@/modules/structural-map/domain/types/PortfolioTypes';
import type { ElenaEngine, ElenaRunResult } from '@/modules/structural-map/domain/types/ElenaTypes';
import styles from './ServiceBuilderPage.module.css';

const CytoscapeGraph = lazy(() => import('@/modules/structural-map/ui/components/CytoscapeGraph'));

type ActivePanel = 'catalog';
type Props = { serviceId: string };
type ContextMenu = {
  x: number;
  y: number;
  renderedX: number;
  renderedY: number;
} | null;
type ModalPosition = { x: number; y: number } | null;
type NodeAnchor = { x: number; y: number } | null;
type NodeContextMenu = {
  entity: GraphEntity;
  x: number;
  y: number;
  renderedX: number;
  renderedY: number;
} | null;

const DEPTH_OPTIONS = [1, 2, 3, 4];
const FILTER_OPTIONS = [
  { key: 'all',      label: 'Todo',          icon: Layers },
  { key: 'critical', label: 'Solo críticos', icon: AlertTriangle },
  { key: 'spof',     label: 'SPOF',          icon: Shield },
  { key: 'cascade',  label: 'Cascada',       icon: GitBranch },
];
const ANALYSIS_OPTIONS: { value: ElenaEngine; label: string; fn: string }[] = [
  { value: 'structural', label: 'Análisis estructural', fn: 'fn_elena_systemic_structural_analysis' },
  { value: 'cascade', label: 'Simulación de cascada', fn: 'fn_elena_systemic_cascade_simulation' },
  { value: 'criticality', label: 'Análisis de criticidad', fn: 'fn_elena_systemic_criticality_analysis' },
  { value: 'resilience', label: 'Análisis de resiliencia', fn: 'fn_elena_systemic_resilience_analysis' },
  { value: 'exposure', label: 'Análisis de exposición', fn: 'fn_elena_systemic_exposure_analysis' },
];

export default function ServiceBuilderPage({ serviceId }: Props) {
  const router = useRouter();

  const { data: portfolio } = usePortfolio();
  const { graph, graphError, isPending, depth, changeDepth, addRelation, updateRelation, reload } =
    useServiceGraph(serviceId);

  const [activePanel, setActivePanel]   = useState<ActivePanel>('catalog');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selected, setSelected]         = useState<GraphEntity | GraphRelation | null>(null);
  const [simHighlight, setSimHighlight] = useState<Set<string>>(new Set());
  const [elenaResult, setElenaResult]   = useState<ElenaRunResult | null>(null);
  const [linkMode, setLinkMode]         = useState(false);
  const [contextMenu, setContextMenu]   = useState<ContextMenu>(null);
  const [createEntityModalOpen, setCreateEntityModalOpen] = useState(false);
  const [createEntityModalPosition, setCreateEntityModalPosition] = useState<ModalPosition>(null);
  const [createRelationModalOpen, setCreateRelationModalOpen] = useState(false);
  const [createRelationModalPosition, setCreateRelationModalPosition] = useState<ModalPosition>(null);
  const [nodeAnchor, setNodeAnchor] = useState<NodeAnchor>(null);
  const [nodeContextMenu, setNodeContextMenu] = useState<NodeContextMenu>(null);
  const [quickRelationSource, setQuickRelationSource] = useState<GraphEntity | null>(null);
  const [quickRelationTarget, setQuickRelationTarget] = useState<GraphEntity | null>(null);
  const [isPickingQuickRelationTarget, setIsPickingQuickRelationTarget] = useState(false);
  const [dragLinkSourceId, setDragLinkSourceId] = useState<string | null>(null);
  const [pickRelationSourceMode, setPickRelationSourceMode] = useState(false);
  const [draftEntities, setDraftEntities] = useState<GraphEntity[]>([]);
  const [analysisSelection, setAnalysisSelection] = useState('');
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(100);

  const centerPaneRef = useRef<HTMLDivElement>(null);

  const service      = portfolio?.services.find((s) => s.id === serviceId);
  const entityTypes  = portfolio?.entityTypes  ?? [];
  const relationTypes = portfolio?.relationTypes ?? [];
  const allEntities = useMemo(() => {
    const base = portfolio?.allEntities ?? [];
    const baseIds = new Set(base.map((entity: { id: string }) => entity.id));
    return [...base, ...draftEntities.filter((entity) => !baseIds.has(entity.id))];
  }, [draftEntities, portfolio?.allEntities]);
  const mergedEntities = useMemo(() => {
    const serverEntities = graph?.entities ?? [];
    if (draftEntities.length === 0) return serverEntities;

    const serverIds = new Set(serverEntities.map((entity) => entity.id));
    return [...serverEntities, ...draftEntities.filter((entity) => !serverIds.has(entity.id))];
  }, [draftEntities, graph?.entities]);
  const displayGraph = useMemo(
    () => (graph ? { ...graph, entities: mergedEntities } : null),
    [graph, mergedEntities]
  );

  useEffect(() => {
    if (!graph?.entities) return;
    const serverIds = new Set(graph.entities.map((entity) => entity.id));
    setDraftEntities((current) => current.filter((entity) => !serverIds.has(entity.id)));
  }, [graph?.entities]);

  const highlightedIds =
    activeFilter === 'critical' ? new Set(displayGraph?.entities.filter((e) => e.is_critical_node).map((e) => e.id) ?? [])
    : activeFilter === 'spof'   ? new Set(displayGraph?.entities.filter((e) => e.is_spof).map((e) => e.id) ?? [])
    : simHighlight.size > 0 && activeFilter === 'cascade' ? simHighlight
    : undefined;

  const handleNodeClick = useCallback((entity: GraphEntity) => {
    setNodeContextMenu(null);
    setSelected(entity);
  }, []);
  const handleEdgeClick = useCallback((relation: GraphRelation) => {
    setNodeContextMenu(null);
    setSelected(relation);
  }, []);
  const handleNodeSecondaryAction = useCallback((
    entity: GraphEntity,
    position: { x: number; y: number; renderedX: number; renderedY: number }
  ) => {
    setSelected(entity);
    setNodeContextMenu({ entity, ...position });
    setContextMenu(null);
  }, []);
  const handleQuickRelationStart = useCallback(() => {
    if (!selected || 'source_entity_id' in selected) return;
    setQuickRelationSource(selected);
    setQuickRelationTarget(null);
    setCreateRelationModalOpen(false);
    setIsPickingQuickRelationTarget(true);
    setPickRelationSourceMode(false);
    setDragLinkSourceId(selected.id);
  }, [selected]);
  const resetQuickRelation = useCallback(() => {
    setQuickRelationSource(null);
    setQuickRelationTarget(null);
    setIsPickingQuickRelationTarget(false);
    setCreateRelationModalOpen(false);
    setDragLinkSourceId(null);
    setPickRelationSourceMode(false);
  }, []);

  /* ─── Canvas context menu → create entity ─── */
  const handleCanvasContextMenu = useCallback((position: { x: number; y: number; renderedX: number; renderedY: number }) => {
    setContextMenu(position);
  }, []);

  const handleContextMenuCreate = useCallback(() => {
    const rect = centerPaneRef.current?.getBoundingClientRect();
    if (contextMenu && rect) {
      setCreateEntityModalPosition({
        x: rect.left + contextMenu.renderedX + 12,
        y: rect.top + contextMenu.renderedY + 12,
      });
    } else {
      setCreateEntityModalPosition({ x: 120, y: 140 });
    }
    setCreateEntityModalOpen(true);
    setContextMenu(null);
  }, [contextMenu]);

  const cancelInteraction = useCallback(() => {
    setContextMenu(null);
    setNodeContextMenu(null);
    setDragLinkSourceId(null);
    setPickRelationSourceMode(false);
    setQuickRelationSource(null);
    setQuickRelationTarget(null);
    setCreateRelationModalOpen(false);
    setIsPickingQuickRelationTarget(false);
    setLinkMode(false);
  }, []);

  const handleContextMenuCancel = useCallback(() => {
    setContextMenu(null);
    cancelInteraction();
  }, [cancelInteraction]);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
    setNodeContextMenu(null);
  }, []);

  const handleNodeMenuSelect = useCallback(() => {
    if (!nodeContextMenu) return;
    setSelected(nodeContextMenu.entity);
    setNodeContextMenu(null);
  }, [nodeContextMenu]);

  const handleNodeMenuDefineRelation = useCallback(() => {
    if (!nodeContextMenu) return;
    setSelected(nodeContextMenu.entity);
    setQuickRelationSource(nodeContextMenu.entity);
    setQuickRelationTarget(null);
    setPickRelationSourceMode(false);
    setCreateRelationModalOpen(false);
    setNodeContextMenu(null);
    setContextMenu(null);
    setIsPickingQuickRelationTarget(true);
    window.setTimeout(() => {
      setDragLinkSourceId(nodeContextMenu.entity.id);
    }, 0);
  }, [nodeContextMenu]);

  const handleDeleteEntity = useCallback(async () => {
    if (!nodeContextMenu) return;
    const response = await fetch(`/api/structural-map/entities/${nodeContextMenu.entity.id}`, {
      method: 'DELETE',
    });
    const text = await response.text();
    if (!response.ok) {
      const payload = text ? (JSON.parse(text) as { error?: string }) : {};
      throw new Error(payload.error ?? 'Error al remover entidad');
    }
    setNodeContextMenu(null);
    setSelected(null);
    setQuickRelationSource(null);
    setQuickRelationTarget(null);
    setDragLinkSourceId(null);
    await reload();
  }, [nodeContextMenu, reload]);

  /* ─── Drag-to-link from graph ─── */
  const handleDragLink = useCallback((sourceId: string, targetId: string) => {
    const sourceEntity = displayGraph?.entities.find((entity) => entity.id === sourceId) ?? null;
    const targetEntity = displayGraph?.entities.find((entity) => entity.id === targetId) ?? null;

    setDragLinkSourceId(null);
    setPickRelationSourceMode(false);
    setIsPickingQuickRelationTarget(false);

    if (!sourceEntity || !targetEntity || sourceEntity.id === targetEntity.id) {
      setQuickRelationSource(null);
      setQuickRelationTarget(null);
      return;
    }

    const rect = centerPaneRef.current?.getBoundingClientRect();
    setQuickRelationSource(sourceEntity);
    setQuickRelationTarget(targetEntity);
    setCreateRelationModalPosition(
      nodeAnchor && rect
        ? { x: rect.left + nodeAnchor.x + 24, y: rect.top + nodeAnchor.y + 24 }
        : { x: 220, y: 180 }
    );
    setCreateRelationModalOpen(true);
  }, [displayGraph?.entities, nodeAnchor]);

  const handleRelationSourcePick = useCallback((entity: GraphEntity) => {
    setQuickRelationSource(entity);
    setQuickRelationTarget(null);
    setSelected(entity);
    setIsPickingQuickRelationTarget(true);
    setCreateRelationModalOpen(false);
  }, []);

  const handleDeleteRelation = useCallback(async (id: string) => {
    const res = await fetch(`/api/structural-map/relations/${id}`, { method: 'DELETE' });
    const text = await res.text();
    if (!res.ok) {
      const payload = text ? (JSON.parse(text) as { error?: string }) : {};
      throw new Error(payload.error ?? 'Error al eliminar relación');
    }
    reload();
    setSelected(null);
  }, [reload]);

  /* ─── Update relation from context panel ─── */
  const handleUpdateRelation = useCallback(async (id: string, input: {
    source_entity_id?: string;
    target_entity_id?: string;
    relation_type_id?: string;
    weight?: number | null;
    strength?: string | null;
    description?: string | null;
  }) => {
    await updateRelation(id, input);
    setSelected(null);
  }, [updateRelation]);

  const handleSimulateNode = useCallback(async (entityId: string, scenario: string) => {
    const res = await fetch('/api/structural-map/elena/run', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rootEntityId: entityId, engine: 'cascade', scenario }),
    });
    const text = await res.text();
    if (!text) return;
    const result = JSON.parse(text) as ElenaRunResult;
    setElenaResult(result);
    if (result.ok) {
      setSimHighlight(new Set(result.rows.map((r) => r.entity_id)));
      setActiveFilter('cascade');
    }
  }, []);

  const handleRunHeaderAnalysis = useCallback(async (engine: ElenaEngine) => {
    if (!serviceId) return;
    setAnalysisRunning(true);
    try {
      const res = await fetch('/api/structural-map/elena/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rootEntityId: serviceId,
          engine,
          scenario: engine === 'cascade' ? 'FAILURE' : undefined,
        }),
      });
      const text = await res.text();
      if (!text) return;
      const result = JSON.parse(text) as ElenaRunResult;
      setElenaResult(result);
      if (result.ok && result.engine === 'cascade') {
        setSimHighlight(new Set(result.rows.map((row) => row.entity_id)));
        setActiveFilter('cascade');
      }
      if (result.ok) {
        await reload();
      }
    } finally {
      setAnalysisRunning(false);
      setAnalysisSelection('');
    }
  }, [reload, serviceId]);

  const handleCreateEntity = useCallback(async (input: CreateEntityInput) => {
    const res = await fetch('/api/structural-map/entities', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const text = await res.text();
    if (!res.ok) {
      const payload = text ? (JSON.parse(text) as { error?: string }) : {};
      throw new Error(payload.error ?? 'Error al crear entidad');
    }
    const payload = text ? (JSON.parse(text) as { id: string }) : { id: '' };
    const entityType = entityTypes.find((type) => type.id === input.entity_type_id);
    const draftEntity: GraphEntity = {
      id: payload.id,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? 'active',
      criticality_level: input.criticality_level ?? 'medium',
      entity_type_id: input.entity_type_id,
      entity_type_code: entityType?.code ?? 'UNKNOWN',
      entity_type_name: entityType?.name ?? 'Entidad',
      is_active: true,
      criticality_score: null,
      resilience_score: null,
      exposure_score: null,
      is_spof: false,
      is_critical_node: false,
      total_degree: 0,
    };
    setDraftEntities((current) => [draftEntity, ...current.filter((entity) => entity.id !== draftEntity.id)]);
    setSelected(draftEntity);
    setContextMenu(null);
    setNodeContextMenu(null);
    return payload;
  }, [entityTypes]);
  const handleCreateRelationFromModal = useCallback(async (input: {
    source_entity_id: string;
    target_entity_id: string;
    relation_type_id: string;
    weight?: number;
    strength?: string;
    description?: string;
  }) => {
    await addRelation(input);
    resetQuickRelation();
  }, [addRelation, resetQuickRelation]);

  const entityCount   = displayGraph?.entities.length  ?? 0;
  const relationCount = displayGraph?.relations.length ?? 0;

  return (
    <div className={styles.layout} onClick={handleCloseContextMenu}>
      {/* Topbar */}
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <Link href="/gestion/structural-map" className={styles.backBtn}>
            <ChevronLeft size={14} /> Portafolio
          </Link>
          <div className={styles.serviceTitle}>
            <div className={styles.serviceDot} />
            <span className={styles.serviceTitleName}>{service?.name ?? 'Cargando servicio…'}</span>
            <span className={styles.serviceTitleCode}>{service?.code}</span>
          </div>
        </div>

        <div className={styles.topBarCenter}>
          <div className={styles.depthControls}>
            <span className={styles.zoomBadge}>Zoom {canvasZoom}%</span>
            <span className={styles.depthLabel}>Profundidad:</span>
            {DEPTH_OPTIONS.map((d) => (
              <button key={d} onClick={() => changeDepth(d)} className={depth === d ? styles.depthBtnActive : styles.depthBtn}>{d}</button>
            ))}
          </div>
          <div className={styles.filterControls}>
            {FILTER_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveFilter(key)} className={activeFilter === key ? styles.filterBtnActive : styles.filterBtn}>
                <Icon size={11} /> {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setLinkMode((prev) => !prev)}
            className={linkMode ? styles.linkBtnActive : styles.linkBtn}
            title={linkMode ? 'Desactivar modo vincular' : 'Activar modo vincular: clic en nodo origen → clic en nodo destino'}
          >
            <Link2 size={12} /> Vincular
          </button>
          <label className={styles.analysisComboWrap}>
            <span className={styles.analysisComboLabel}>Análisis</span>
            <select
              value={analysisSelection}
              onChange={(event) => {
                const engine = event.target.value as ElenaEngine;
                setAnalysisSelection(engine);
                if (engine) {
                  void handleRunHeaderAnalysis(engine);
                }
              }}
              disabled={analysisRunning}
              className={styles.analysisCombo}
              title="Ejecutar motor Elena sobre el nodo raíz actual"
            >
              <option value="">{analysisRunning ? 'Ejecutando…' : 'Seleccionar análisis'}</option>
              {ANALYSIS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} · {option.fn}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.topBarRight}>
          <span className={styles.graphStat}>{entityCount} entidades</span>
          <span className={styles.graphStat}>{relationCount} relaciones</span>
          {isPending && <div className={styles.spinner} />}
          <button onClick={() => router.push('/gestion/structural-map')} className={styles.closeBtn}>✕</button>
        </div>
      </header>

      {/* Three-pane layout */}
      <div className={styles.threePane}>
        {/* Left: catalog */}
        <aside className={styles.leftPane}>
          <div className={styles.panelTabs}>
            <button onClick={() => setActivePanel('catalog')}  className={activePanel === 'catalog'  ? styles.tabActive : styles.tab}>
              <Network size={12} /> Catálogo
            </button>
            <button
              onClick={() => {
                if (serviceId) {
                  void handleRunHeaderAnalysis('structural');
                }
              }}
              className={styles.tab}
              title="Ejecutar análisis estructural"
            >
              <CheckSquare size={12} /> Ejecutar
            </button>
          </div>
          <div className={styles.paneBody}>
            {activePanel === 'catalog' && (
              <EntityCatalogPanel
                entityTypes={entityTypes}
                relationTypes={relationTypes}
                entities={displayGraph?.entities ?? []}
                allEntities={allEntities}
                rootEntityId={serviceId}
                selectedEntityId={selected && !('source_entity_id' in selected) ? selected.id : null}
                relationSeed={{ sourceId: null, targetId: null, stage: 'idle' }}
                onClearRelationSeed={() => undefined}
                onCreateEntity={handleCreateEntity}
                onCreateRelation={addRelation}
              />
            )}
          </div>
        </aside>

        {/* Center: Cytoscape graph */}
        <main className={styles.centerPane} ref={centerPaneRef}>
          {graphError && (
            <div className={styles.graphError}>
              <AlertTriangle size={14} /> {graphError}
            </div>
          )}
          {!graph && !graphError && isPending && (
            <div className={styles.graphLoading}>
              <div className={styles.spinnerLg} />
              <p>Construyendo subgrafo…</p>
            </div>
          )}
          {!graph && !isPending && !graphError && (
            <div className={styles.graphEmpty}>
              <Network size={36} color="#334155" />
              <p>No hay datos de grafo para este servicio</p>
            </div>
          )}
          {displayGraph && (
            <Suspense fallback={<div className={styles.graphLoading}><div className={styles.spinnerLg} /></div>}>
              <CytoscapeGraph
                data={displayGraph}
                rootEntityId={serviceId}
                selectedNodeId={selected && !('source_entity_id' in selected) ? selected.id : null}
                highlightedIds={highlightedIds}
                linkMode={linkMode}
                dragLinkSourceId={dragLinkSourceId}
                pickRelationSourceMode={pickRelationSourceMode}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                onNodeSecondaryAction={handleNodeSecondaryAction}
                onCanvasContextMenu={handleCanvasContextMenu}
                onDragLink={handleDragLink}
                onRelationSourcePick={handleRelationSourcePick}
                onSelectedNodeAnchorChange={setNodeAnchor}
                onZoomChange={setCanvasZoom}
              />
            </Suspense>
          )}

          {selected && !('source_entity_id' in selected) && nodeAnchor && !isPickingQuickRelationTarget && !createRelationModalOpen && (
            <div className={styles.nodeActionOrbit}>
              {[
                { key: 'top', dx: 0, dy: -54 },
                { key: 'right', dx: 54, dy: 0 },
                { key: 'bottom', dx: 0, dy: 54 },
                { key: 'left', dx: -54, dy: 0 },
                { key: 'top-right', dx: 38, dy: -38 },
                { key: 'bottom-left', dx: -38, dy: 38 },
              ].map((orbit) => (
                <button
                  key={orbit.key}
                  type="button"
                  className={styles.nodePlusButton}
                  style={{ left: nodeAnchor.x + orbit.dx, top: nodeAnchor.y + orbit.dy }}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    handleQuickRelationStart();
                  }}
                  title="Crear relación desde este nodo"
                >
                  +
                </button>
              ))}
            </div>
          )}

          {/* Link mode indicator */}
          {linkMode && (
            <div className={styles.linkModeIndicator}>
              <Link2 size={13} /> Modo vincular activo — Clic en nodo origen, luego clic en nodo destino
            </div>
          )}
          {pickRelationSourceMode && (
            <div className={styles.quickRelationGuide}>
              Definir relación: mantén clic en el nodo origen y arrastra hasta el nodo destino.
            </div>
          )}
          {isPickingQuickRelationTarget && quickRelationSource && (
            <div className={styles.quickRelationGuide}>
              Relación visual desde <strong>{quickRelationSource.name ?? quickRelationSource.code}</strong>: arrastra hasta el nodo destino y suelta para abrir el modal.
            </div>
          )}
          {displayGraph && (
            <div className={styles.graphLegend}>
              <span className={styles.legendDot} style={{ background: '#6366f1' }} /> Servicio
              <span className={styles.legendDot} style={{ background: '#14b8a6' }} /> Proceso
              <span className={styles.legendDot} style={{ background: '#3b82f6' }} /> App
              <span className={styles.legendDot} style={{ background: '#8b5cf6' }} /> Sistema
              <span className={styles.legendDot} style={{ background: '#f59e0b' }} /> Proveedor
              <span className={styles.legendDot} style={{ background: '#ef4444' }} /> Riesgo
              <span className={styles.legendDot} style={{ background: '#22c55e' }} /> Control
              <span className={styles.legendDot} style={{ background: '#f87171' }} /> Crítico
              <span className={styles.legendDot} style={{ background: '#fb923c' }} /> SPOF
            </div>
          )}

          {/* Context menu on right-click on canvas */}
          {contextMenu && (
            <div
              className={styles.contextMenuOverlay}
              onClick={(e) => { e.stopPropagation(); handleCloseContextMenu(); }}
            >
              <div
                className={styles.contextMenu}
                style={{ left: contextMenu.renderedX, top: contextMenu.renderedY }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className={styles.contextMenuItem}
                  onClick={handleContextMenuCreate}
                >
                  <span className={styles.contextMenuIcon}><Plus size={14} /></span>
                  Crear entidad
                </button>
                <button
                  className={styles.contextMenuItem}
                  onClick={handleContextMenuCancel}
                >
                  <span className={styles.contextMenuIcon}>×</span>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {nodeContextMenu && (
            <div
              className={styles.contextMenuOverlay}
              onClick={(event) => {
                event.stopPropagation();
                setNodeContextMenu(null);
              }}
            >
              <div
                className={styles.contextMenu}
                style={{ left: nodeContextMenu.renderedX, top: nodeContextMenu.renderedY }}
                onClick={(event) => event.stopPropagation()}
              >
                <button className={styles.contextMenuItem} onClick={() => { void handleDeleteEntity().catch(console.error); }}>
                  <span className={styles.contextMenuIcon}><Trash2 size={14} /></span>
                  Remover entidad
                </button>
                <button className={styles.contextMenuItem} onClick={handleNodeMenuDefineRelation}>
                  <span className={styles.contextMenuIcon}><Link2 size={14} /></span>
                  Definir relación
                </button>
                <button className={styles.contextMenuItem} onClick={handleNodeMenuSelect}>
                  <span className={styles.contextMenuIcon}><MousePointer2 size={14} /></span>
                  Escoger entidad
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Right: node context */}
        <aside className={styles.rightPane}>
          <div className={styles.paneHeader}>Panel contextual</div>
          <NodeContextPanel
            selected={selected}
            entities={displayGraph?.entities ?? []}
            relationTypes={relationTypes}
            onDeleteRelation={handleDeleteRelation}
            onUpdateRelation={handleUpdateRelation}
            onSimulateNode={handleSimulateNode}
          />
        </aside>
      </div>

      <CreateEntityModal
        open={createEntityModalOpen}
        entityTypes={entityTypes}
        initialPosition={createEntityModalPosition}
        onClose={() => setCreateEntityModalOpen(false)}
        onSubmit={async (input) => {
          await handleCreateEntity(input);
        }}
      />
      <CreateRelationModal
        open={createRelationModalOpen}
        source={quickRelationSource}
        target={quickRelationTarget}
        relationTypes={relationTypes}
        initialPosition={createRelationModalPosition}
        onClose={resetQuickRelation}
        onSubmit={handleCreateRelationFromModal}
      />

      {/* Elena result drawer — rendered as overlay above everything */}
      <ElenaEngineResultPanel
        result={elenaResult}
        onClose={() => setElenaResult(null)}
      />
    </div>
  );
}

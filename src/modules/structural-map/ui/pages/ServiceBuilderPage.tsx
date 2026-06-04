'use client';

import { useState, useCallback, useEffect, lazy, Suspense, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Network, ChevronLeft, Layers, Eye, Shield, AlertTriangle, GitBranch, CheckSquare, Link2, Activity, Plus } from 'lucide-react';
import { usePortfolio } from '@/modules/structural-map/ui/hooks/usePortfolio';
import { useServiceGraph } from '@/modules/structural-map/ui/hooks/useServiceGraph';
import { EntityCatalogPanel } from '@/modules/structural-map/ui/components/EntityCatalogPanel';
import { NodeContextPanel } from '@/modules/structural-map/ui/components/NodeContextPanel';
import { AnalysisPanel } from '@/modules/structural-map/ui/components/AnalysisPanel';
import { ElenaEngineResultPanel } from '@/modules/structural-map/ui/components/ElenaEngineResultPanel';
import { CreateEntityModal } from '@/modules/structural-map/ui/components/CreateEntityModal';
import type { GraphEntity, GraphRelation } from '@/modules/structural-map/domain/types/GraphTypes';
import type { CreateEntityInput } from '@/modules/structural-map/domain/types/PortfolioTypes';
import type { ElenaRunResult } from '@/modules/structural-map/domain/types/ElenaTypes';
import styles from './ServiceBuilderPage.module.css';

const CytoscapeGraph = lazy(() => import('@/modules/structural-map/ui/components/CytoscapeGraph'));

type ActivePanel = 'catalog' | 'analysis';
type Props = { serviceId: string };
type RelationDraft = {
  sourceId: string | null;
  targetId: string | null;
  stage: 'idle' | 'picking-target' | 'ready';
};
type ContextMenu = {
  x: number;
  y: number;
  renderedX: number;
  renderedY: number;
} | null;
type ModalPosition = { x: number; y: number } | null;

const DEPTH_OPTIONS = [1, 2, 3, 4];
const FILTER_OPTIONS = [
  { key: 'all',      label: 'Todo',          icon: Layers },
  { key: 'critical', label: 'Solo críticos', icon: AlertTriangle },
  { key: 'spof',     label: 'SPOF',          icon: Shield },
  { key: 'cascade',  label: 'Cascada',       icon: GitBranch },
];

export default function ServiceBuilderPage({ serviceId }: Props) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const initTab      = searchParams.get('tab') === 'analysis' ? 'analysis' : 'catalog';

  const { data: portfolio } = usePortfolio();
  const { graph, graphError, isPending, depth, changeDepth, validateModel, addRelation, updateRelation, reload } =
    useServiceGraph(serviceId);

  const [activePanel, setActivePanel]   = useState<ActivePanel>(initTab as ActivePanel);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selected, setSelected]         = useState<GraphEntity | GraphRelation | null>(null);
  const [simHighlight, setSimHighlight] = useState<Set<string>>(new Set());
  const [elenaResult, setElenaResult]   = useState<ElenaRunResult | null>(null);
  const [linkMode, setLinkMode]         = useState(false);
  const [contextMenu, setContextMenu]   = useState<ContextMenu>(null);
  const [createEntityModalOpen, setCreateEntityModalOpen] = useState(false);
  const [createEntityModalPosition, setCreateEntityModalPosition] = useState<ModalPosition>(null);
  const [relationDraft, setRelationDraft] = useState<RelationDraft>({
    sourceId: null,
    targetId: null,
    stage: 'idle',
  });
  const [draftEntities, setDraftEntities] = useState<GraphEntity[]>([]);

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
    if (searchParams.get('tab') === 'analysis') setActivePanel('analysis');
  }, [searchParams]);

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

  const handleNodeClick = useCallback((entity: GraphEntity) => { setSelected(entity); }, []);
  const handleEdgeClick = useCallback((relation: GraphRelation) => { setSelected(relation); }, []);
  const handleNodeSecondaryAction = useCallback((entity: GraphEntity) => {
    setSelected(entity);
    setActivePanel('catalog');
    setRelationDraft((current) => {
      if (!current.sourceId || current.stage === 'ready' || current.sourceId === entity.id) {
        return {
          sourceId: entity.id,
          targetId: null,
          stage: 'picking-target',
        };
      }

      if (current.sourceId && current.sourceId !== entity.id) {
        return {
          sourceId: current.sourceId,
          targetId: entity.id,
          stage: 'ready',
        };
      }

      return current;
    });
  }, []);
  const clearRelationDraft = useCallback(() => {
    setRelationDraft({ sourceId: null, targetId: null, stage: 'idle' });
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

  const handleContextMenuAnalysis = useCallback(() => {
    setContextMenu(null);
    setActivePanel('analysis');
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  /* ─── Drag-to-link from graph ─── */
  const handleDragLink = useCallback((sourceId: string, targetId: string) => {
    setRelationDraft({ sourceId, targetId, stage: 'ready' });
    setActivePanel('catalog');
    setLinkMode(false);
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

  const handleElenaResult = useCallback((result: ElenaRunResult) => {
    setElenaResult(result);
    if (result.ok && result.engine === 'cascade') {
      setSimHighlight(new Set(result.rows.map((r) => r.entity_id)));
      setActiveFilter('cascade');
    }
  }, []);

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
    return payload;
  }, [entityTypes]);

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
        {/* Left: catalog + analysis tabs */}
        <aside className={styles.leftPane}>
          <div className={styles.panelTabs}>
            <button onClick={() => setActivePanel('catalog')}  className={activePanel === 'catalog'  ? styles.tabActive : styles.tab}>
              <Network size={12} /> Catálogo
            </button>
            <button onClick={() => setActivePanel('analysis')} className={activePanel === 'analysis' ? styles.tabActive : styles.tab}>
              <Eye size={12} /> Análisis
            </button>
            <button
              onClick={() => { setActivePanel('analysis'); }}
              className={styles.tab}
              title="Validar modelo"
            >
              <CheckSquare size={12} /> Validar
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
                relationSeed={relationDraft}
                onClearRelationSeed={clearRelationDraft}
                onCreateEntity={handleCreateEntity}
                onCreateRelation={addRelation}
              />
            )}
            {activePanel === 'analysis' && (
              <AnalysisPanel
                rootEntityId={serviceId}
                rootEntityName={service?.name}
                onValidate={validateModel}
                onResult={handleElenaResult}
                onGraphRefresh={reload}
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
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                onNodeSecondaryAction={handleNodeSecondaryAction}
                onCanvasContextMenu={handleCanvasContextMenu}
                onDragLink={handleDragLink}
              />
            </Suspense>
          )}

          {/* Link mode indicator */}
          {linkMode && (
            <div className={styles.linkModeIndicator}>
              <Link2 size={13} /> Modo vincular activo — Clic en nodo origen, luego clic en nodo destino
            </div>
          )}

          {displayGraph && relationDraft.stage === 'picking-target' && !linkMode && (
            <div className={styles.relationGuide}>
              Relación visual activa: ya marcaste el origen. Haz clic derecho sobre el nodo destino para completar la selección.
            </div>
          )}
          {displayGraph && relationDraft.stage === 'ready' && (
            <div className={styles.relationGuideReady}>
              Origen y destino listos. Completa tipo, fuerza y peso en el panel izquierdo y pulsa `Crear relación`.
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
                  onClick={handleContextMenuAnalysis}
                >
                  <span className={styles.contextMenuIcon}><Activity size={14} /></span>
                  Análisis
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

      {/* Elena result drawer — rendered as overlay above everything */}
      <ElenaEngineResultPanel
        result={elenaResult}
        onClose={() => setElenaResult(null)}
      />
    </div>
  );
}

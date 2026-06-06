'use client';

import { useRef, useCallback, lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Activity, AlertTriangle, SlidersHorizontal, ZoomIn } from 'lucide-react';
import { useCanvasStateMachine } from '@/modules/structural-map/ui/hooks/useCanvasStateMachine';
import { useModeloGraph } from '@/modules/structural-map/ui/hooks/useModeloGraph';
import { useStructuralMapFilters } from '@/modules/structural-map/ui/hooks/useStructuralMapFilters';
import { useEntityColors } from '@/modules/structural-map/ui/colors/entityColors';
import { AnalysisPanel } from '@/modules/structural-map/ui/components/AnalysisPanel';
import { ElenaEngineResultPanel } from '@/modules/structural-map/ui/components/ElenaEngineResultPanel';
import { FiltersDrawer } from '@/modules/structural-map/ui/components/filters/FiltersDrawer';
import { EntitiesCatalogDrawer } from '@/modules/structural-map/ui/components/canvas/EntitiesCatalogDrawer';
import { EntityEditForm }    from '@/modules/structural-map/ui/components/canvas/EntityEditForm';
import { EntityPickerPanel } from '@/modules/structural-map/ui/components/canvas/EntityPickerPanel';
import { RelationFormPopover } from '@/modules/structural-map/ui/components/canvas/RelationFormPopover';
import { applyGraphFilters } from '@/modules/structural-map/ui/lib/applyGraphFilters';
import type { GraphEntity, GraphRelation, SubgraphData } from '@/modules/structural-map/domain/types/GraphTypes';
import type { ScreenPos } from '@/modules/structural-map/domain/types/ModeloTypes';
import { STRENGTH_STYLE, STRENGTH_OPTIONS } from '@/modules/structural-map/domain/types/ModeloTypes';
import type { ElenaRunResult } from '@/modules/structural-map/domain/types/ElenaTypes';
import type { ValidationResult } from '@/modules/structural-map/domain/types/PortfolioTypes';
import styles from './ModeloCanvasPage.module.css';

const ModelCanvas = lazy(() => import('@/modules/structural-map/ui/components/canvas/ModelCanvas'));

type PendingRelation = { sourceId: string; targetId: string; targetScreenPos: ScreenPos };

export default function ModeloCanvasPage() {
  const searchParams  = useSearchParams();
  const rootEntityId  = searchParams.get('serviceId') ?? undefined;
  const filters = useStructuralMapFilters(rootEntityId);
  const requestedGraphDepth = useMemo(() => {
    if (!rootEntityId) return 3;
    if (filters.selection?.viewCode === 'todo') return 8;
    if (filters.selection?.depth == null) return 8;
    return Math.max(1, Math.min(8, filters.selection?.depth ?? filters.activeViewRule?.default_depth ?? 3));
  }, [filters.activeViewRule?.default_depth, filters.selection?.depth, filters.selection?.viewCode, rootEntityId]);

  const sm    = useCanvasStateMachine();
  const graph = useModeloGraph(rootEntityId, requestedGraphDepth);
  const colorMap = useEntityColors();
  const cyRef = useRef<cytoscape.Core | null>(null);

  const [pendingRelation, setPendingRelation] = useState<PendingRelation | null>(null);
  const [elenaResult,     setElenaResult]     = useState<ElenaRunResult | null>(null);
  const [showAnalysis,    setShowAnalysis]    = useState(false);
  const [showFilters,     setShowFilters]     = useState(false);
  const [editingEdgeId,   setEditingEdgeId]   = useState<string | null>(null);
  const [editingEdgePos,  setEditingEdgePos]  = useState<ScreenPos | null>(null);
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [zoomLevel,       setZoomLevel]       = useState<number>(0.45);
  const [pickerForNode,   setPickerForNode]   = useState<string | null>(null);
  const [showCatalogDrawer, setShowCatalogDrawer] = useState(false);
  const [catalogClickPos, setCatalogClickPos] = useState<{ screen: ScreenPos; graph: { x: number; y: number } } | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        sm.escape();
        setPendingRelation(null);
        setEditingEdgeId(null);
        setEditingEdgePos(null);
        setEditingEntityId(null);
        setPickerForNode(null);
        setShowCatalogDrawer(false);
        setShowFilters(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sm]);

  const handleCanvasClick = useCallback((screenPos: ScreenPos, graphPos: { x: number; y: number }) => {
    if (sm.state.mode === 'creating_relation') return;
    if (sm.state.mode === 'editing_relation') return;
    if (sm.state.mode === 'node_selected' || sm.state.mode === 'node_context_menu') { sm.deselect(); }
    setShowCatalogDrawer(false);
  }, [sm]);

  const handleCanvasContextMenu = useCallback((screenPos: ScreenPos, graphPos: { x: number; y: number }) => {
    if (sm.state.mode === 'creating_relation') return;
    if (sm.state.mode === 'editing_relation') return;

    setEditingEdgeId(null);
    setEditingEdgePos(null);
    setEditingEntityId(null);
    setPickerForNode(null);
    sm.deselect();

    setCatalogClickPos({ screen: screenPos, graph: graphPos });
    setShowCatalogDrawer(true);
  }, [sm]);

  const handleNodeClick = useCallback((entity: GraphEntity, renderedPos: ScreenPos) => {
    if (sm.state.mode === 'creating_relation') return;
    sm.selectNode(entity.id, renderedPos);
  }, [sm]);

  const handleNodeContextMenu = useCallback((entity: GraphEntity, renderedPos: ScreenPos) => {
    if (sm.state.mode === 'creating_relation') return;
    sm.showContextMenu(entity.id, renderedPos);
  }, [sm]);

  const handleNodeDblClick = useCallback((entity: GraphEntity) => {
    sm.selectNode(entity.id, sm.state.nodeRenderedPos ?? { x: 0, y: 0 });
    setEditingEntityId(entity.id);
  }, [sm]);

  const handleEdgeDblClick = useCallback((relation: GraphRelation, screenPos: ScreenPos) => {
    setPendingRelation(null);
    setEditingEntityId(null);
    setEditingEdgeId(relation.id);
    setEditingEdgePos(screenPos);
    sm.selectEdge(relation.id);
  }, [sm]);

  const handleRelationStart = useCallback((sourceId: string, mousePos: ScreenPos) => {
    setPendingRelation(null);
    setEditingEdgeId(null);
    setEditingEdgePos(null);
    sm.startCreateRelation(sourceId, mousePos);
  }, [sm]);

  const handleRelationCancel = useCallback(() => {
    setPendingRelation(null);
    sm.cancelRelation();
  }, [sm]);

  const handleNodePickEntity = useCallback((nodeId: string) => {
    setPickerForNode(nodeId);
  }, []);

  const handlePickedEntity = useCallback((entity: GraphEntity) => {
    setPickerForNode(null);
    if (!pickerForNode) return;

    void (async () => {
      const res = await fetch(`/api/structural-map/graph?rootEntityId=${encodeURIComponent(entity.id)}&depth=1`, {
        cache: 'no-store',
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(text || 'No fue posible cargar la entidad y sus relaciones');
      }

      const subgraph = JSON.parse(text) as SubgraphData;
      graph.mergeSubgraph(subgraph);

      const rp = cyRef.current?.getElementById(entity.id).renderedPosition() as ScreenPos | undefined;
      const rect = document.querySelector('[data-cy-container]')?.getBoundingClientRect();
      const renderedPos: ScreenPos = rp
        ? { x: (rect?.left ?? 0) + rp.x, y: (rect?.top ?? 0) + rp.y }
        : sm.state.nodeRenderedPos ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };

      sm.deselect();
      sm.selectNode(entity.id, renderedPos);
      sm.markDirty();
    })().catch((error: unknown) => {
      window.alert(error instanceof Error ? error.message : 'No fue posible asociar la entidad existente');
    });
  }, [pickerForNode, graph, sm]);

  const handleNodeDeleteAction = useCallback(async (nodeId: string) => {
    const entity = graph.data?.allEntities.find((e) => e.id === nodeId)
                || graph.data?.entities.find((e) => e.id === nodeId);
    if (!window.confirm(`¿Eliminar "${entity?.name ?? nodeId}" y todas sus relaciones?`)) return;
    const res = await fetch(`/api/structural-map/entities/${nodeId}`, { method: 'DELETE' });
    if (!res.ok) { window.alert('Error al eliminar la entidad'); return; }
    graph.removeEntity(nodeId);
    await graph.reload();
    sm.deselect();
    sm.markDirty();
  }, [graph, sm]);

  const handleNodeAnalyzeAction = useCallback((nodeId: string) => {
    void (async () => {
      try {
        const visibleScopeEntityIds = applyGraphFilters({
          entities: graph.data?.entities ?? [],
          relations: graph.data?.relations ?? [],
          rootEntityId,
          selection: filters.selection,
          viewRule: filters.activeViewRule,
        }).entities.map((entity) => entity.id);

        const res  = await fetch('/api/structural-map/elena/run', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rootEntityId: nodeId,
            engine: 'criticality',
            scopeEntityIds: visibleScopeEntityIds,
          }),
        });
        const text = await res.text();
        const result = text ? JSON.parse(text) as ElenaRunResult : null;
        if (result) { setElenaResult(result); sm.markDirty(); graph.reload(); }
      } catch {
        window.alert('No fue posible ejecutar el análisis');
      }
    })();
  }, [filters.activeViewRule, filters.selection, graph, rootEntityId, sm]);

  const handleNodeDuplicateAction = useCallback(async (nodeId: string) => {
    const entityToDuplicate = graph.data?.entities.find((e) => e.id === nodeId);
    if (!entityToDuplicate) return;

    const newCode = `${entityToDuplicate.code}_COPY_${Date.now().toString().slice(-4)}`;

    const input = {
      entity_type_id: entityToDuplicate.entity_type_id,
      code: newCode,
      name: `${entityToDuplicate.name} (copia)`,
      description: entityToDuplicate.description,
      criticality_level: entityToDuplicate.criticality_level ?? 'medium',
    };

    try {
      const res = await fetch('/api/structural-map/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const text = await res.text();
      if (!res.ok) throw new Error((JSON.parse(text) as { error?: string }).error ?? 'Error al duplicar entidad');
      
      const { id, code } = JSON.parse(text) as { id: string; code: string };
      
      graph.addEntity({
        ...entityToDuplicate,
        id,
        code,
        name: input.name,
      });

      sm.deselect();
      sm.selectNode(id, sm.state.nodeRenderedPos ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 });
      setEditingEntityId(id);
      sm.markDirty();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Error al duplicar entidad');
    }
  }, [graph, sm]);

  const handleUpdateEntity = useCallback(async (id: string, patch: { name?: string; description?: string | null; criticality_level?: string }) => {
    const res  = await fetch(`/api/structural-map/entities/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const text = await res.text();
    if (!res.ok) throw new Error((JSON.parse(text) as { error?: string }).error ?? 'Error al actualizar entidad');
    graph.updateEntity(id, patch as Partial<GraphEntity>);
    setEditingEntityId(null);
    sm.markDirty();
  }, [graph, sm]);

  const handleDeleteEntityFromForm = useCallback(async (id: string) => {
    const res = await fetch(`/api/structural-map/entities/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar entidad');
    graph.removeEntity(id);
    setEditingEntityId(null);
    sm.deselect();
    sm.markDirty();
  }, [graph, sm]);

  const handleTargetSelected = useCallback((targetId: string) => {
    if (!sm.state.pendingSourceId) return;

    const sourcePos = cyRef.current?.getElementById(sm.state.pendingSourceId).renderedPosition() as ScreenPos | undefined;
    const targetPos = cyRef.current?.getElementById(targetId).renderedPosition() as ScreenPos | undefined;
    const rect = document.querySelector('[data-cy-container]')?.getBoundingClientRect();
    const sp: ScreenPos = {
      x: (rect?.left ?? 0) + (((sourcePos?.x ?? 0) + (targetPos?.x ?? 0)) / 2),
      y: (rect?.top ?? 0) + (((sourcePos?.y ?? 0) + (targetPos?.y ?? 0)) / 2),
    };
    const sourceId = sm.state.pendingSourceId;
    sm.setPendingTarget();
    setPendingRelation({ sourceId, targetId, targetScreenPos: sp });
  }, [sm]);

  const handleSelectCatalogEntity = useCallback((entity: GraphEntity) => {
    if (!catalogClickPos) return;

    try {
      const all = JSON.parse(localStorage.getItem('kiriox-node-positions') ?? '{}');
      all[entity.id] = catalogClickPos.graph;
      localStorage.setItem('kiriox-node-positions', JSON.stringify(all));
    } catch (e) {
      console.error(e);
    }

    graph.addEntity(entity);
    sm.markDirty();
  }, [catalogClickPos, graph, sm]);

  const handleCreateCatalogEntity = useCallback(async (input: { entity_type_id: string; code: string; name: string; description?: string; criticality_level: string }) => {
    if (!catalogClickPos) return;

    const res  = await fetch('/api/structural-map/entities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const text = await res.text();
    if (!res.ok) throw new Error((JSON.parse(text) as { error?: string }).error ?? 'Error al crear entidad');
    const { id, code } = JSON.parse(text) as { id: string; code: string };

    try {
      const all = JSON.parse(localStorage.getItem('kiriox-node-positions') ?? '{}');
      all[id] = catalogClickPos.graph;
      localStorage.setItem('kiriox-node-positions', JSON.stringify(all));
    } catch (e) {
      console.error(e);
    }

    await graph.reload();

    const et = graph.data?.entityTypes.find((t) => t.id === input.entity_type_id);
    graph.addEntity({
      id, code, name: input.name, description: input.description ?? null,
      status: 'active', criticality_level: input.criticality_level,
      entity_type_id: input.entity_type_id, entity_type_code: et?.code ?? '', entity_type_name: et?.name ?? '',
      is_active: true, is_spof: false, is_critical_node: false, total_degree: 0,
      criticality_score: null, resilience_score: null, exposure_score: null,
    });
    sm.markDirty();
  }, [catalogClickPos, graph, sm]);

  const handleCreateRelation = useCallback(async (input: { source_entity_id: string; target_entity_id: string; relation_type_id: string; strength: string; weight: number; description?: string }) => {
    if (input.source_entity_id === input.target_entity_id) throw new Error('Una entidad no puede relacionarse consigo misma');
    const dup = graph.data?.relations.find((r) => r.source_entity_id === input.source_entity_id && r.target_entity_id === input.target_entity_id && r.relation_type_id === input.relation_type_id);
    if (dup) throw new Error('Ya existe esta relación entre los nodos seleccionados');
    const res  = await fetch('/api/structural-map/relations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const text = await res.text();
    if (!res.ok) throw new Error((JSON.parse(text) as { error?: string }).error ?? 'Error al crear relación');
    const { id } = JSON.parse(text) as { id: string };
    const rt = graph.data?.relationTypes.find((r) => r.id === input.relation_type_id);
    graph.addRelation({ id, source_entity_id: input.source_entity_id, target_entity_id: input.target_entity_id, relation_type_id: input.relation_type_id, relation_type_code: rt?.code ?? '', relation_type_name: rt?.name ?? '', weight: input.weight, strength: input.strength, description: input.description ?? null, is_directional: rt?.is_directional ?? true });
    setPendingRelation(null);
    sm.deselect();
    sm.markDirty();
  }, [graph, sm]);

  const handleUpdateRelation = useCallback(async (id: string, patch: { relation_type_id?: string; strength?: string; weight?: number; description?: string | null }) => {
    const res = await fetch(`/api/structural-map/relations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    const text = await res.text();
    if (!res.ok) throw new Error((JSON.parse(text) as { error?: string }).error ?? 'Error al actualizar relación');
    graph.updateRelation(id, patch as Partial<GraphRelation>);
    setEditingEdgeId(null);
    setEditingEdgePos(null);
    sm.deselectEdge();
  }, [graph, sm]);

  const handleDeleteRelation = useCallback(async (id: string) => {
    const res = await fetch(`/api/structural-map/relations/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar relación');
    graph.removeRelation(id);
    setEditingEdgeId(null);
    setEditingEdgePos(null);
    sm.deselectEdge();
    sm.markDirty();
  }, [graph, sm]);

  const handlePanZoom = useCallback(() => {
    if (sm.state.selectedNodeId && cyRef.current) {
      const rp = cyRef.current.getElementById(sm.state.selectedNodeId).renderedPosition() as ScreenPos;
      sm.updateNodePos(rp);
    }
  }, [sm]);

  const handleNodeDragEnd = useCallback((nodeId: string, _graphPos: { x: number; y: number }) => {
    sm.endDrag();
    const rp = cyRef.current?.getElementById(nodeId).renderedPosition() as ScreenPos | undefined;
    if (rp) sm.updateNodePos(rp);
  }, [sm]);

  const handleValidateModel = useCallback(async (): Promise<ValidationResult | null> => {
    const validationRootId = rootEntityId ?? sm.state.selectedNodeId ?? graph.data?.entities[0]?.id ?? null;
    if (!validationRootId) {
      window.alert('No hay una entidad raíz disponible para validar el modelo.');
      return null;
    }

    const res = await fetch('/api/structural-map/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rootEntityId: validationRootId }),
    });
    const text = await res.text();
    if (!res.ok) {
      let message = 'No fue posible validar el modelo';
      if (text) {
        try {
          message = (JSON.parse(text) as { error?: string }).error ?? message;
        } catch {
          message = text;
        }
      }
      throw new Error(message);
    }
    return JSON.parse(text) as ValidationResult;
  }, [graph.data?.entities, rootEntityId, sm.state.selectedNodeId]);

  const allGraphEntities = graph.data?.entities ?? [];
  const allGraphRelations = graph.data?.relations ?? [];
  const filteredGraph = useMemo(() => applyGraphFilters({
    entities: allGraphEntities,
    relations: allGraphRelations,
    rootEntityId,
    selection: filters.selection,
    viewRule: filters.activeViewRule,
  }), [allGraphEntities, allGraphRelations, rootEntityId, filters.selection, filters.activeViewRule]);
  const entities = filteredGraph.entities;
  const relations = filteredGraph.relations;
  const visibleEntities = entities;
  const rootEntity = rootEntityId
    ? allGraphEntities.find((e) => e.id === rootEntityId) ?? entities.find((e) => e.id === rootEntityId) ?? null
    : null;
  const analysisRootId  = rootEntityId ?? sm.state.selectedNodeId ?? entities[0]?.id ?? allGraphEntities[0]?.id ?? '';
  const analysisRootName = rootEntity?.name
    ?? (sm.state.selectedNodeId ? entities.find((e) => e.id === sm.state.selectedNodeId)?.name : null)
    ?? (analysisRootId ? entities.find((e) => e.id === analysisRootId)?.name : null)
    ?? 'Grafo completo';
  const editingRelation = editingEdgeId ? (relations.find((r) => r.id === editingEdgeId) ?? null) : null;
  const pendingSrc      = pendingRelation ? entities.find((e) => e.id === pendingRelation.sourceId)  : undefined;
  const pendingTgt      = pendingRelation ? entities.find((e) => e.id === pendingRelation.targetId)  : undefined;
  const editSrc         = editingRelation ? entities.find((e) => e.id === editingRelation.source_entity_id) : undefined;
  const editTgt         = editingRelation ? entities.find((e) => e.id === editingRelation.target_entity_id) : undefined;
  const edgeEditPos     = editingEdgePos ?? (typeof window !== 'undefined' ? { x: window.innerWidth / 2, y: window.innerHeight / 2 } : { x: 500, y: 400 });

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        {/* Left — navigation */}
        <div className={styles.headerLeft}>
          <Link href="/gestion/structural-map" className={styles.backBtn}><ChevronLeft size={14} /> Portafolio</Link>
          <span className={styles.pageTitle}>
            {rootEntity ? rootEntity.name : 'Modelo estructural completo'}
          </span>
          {rootEntityId && !rootEntity && <span className={styles.pageTitle}>Modelo estructural</span>}
          {sm.state.isDirty && <span className={styles.dirtyBadge}>Cambios pendientes de análisis</span>}
        </div>

        {/* Center — zoom badge + leyenda de tipo de nodo */}
        <div className={styles.headerCenter}>
          <span className={styles.zoomBadge}>
            <ZoomIn size={11} />
            {Math.round(zoomLevel * 100)}%
          </span>
          <div className={styles.headerNodeLegend}>
            <span className={styles.headerNodeLegendTitle}>Tipo de nodo</span>
            {[
              { label: 'Control', color: colorMap.byType.CONTROL ?? '#22c55e' },
              { label: 'Riesgo', color: colorMap.byType.RISK ?? '#ef4444' },
              { label: 'Otros', color: colorMap.fallback },
            ].map((item) => (
              <span key={item.label} className={styles.headerNodeLegendItem}>
                <span className={styles.nodeLegendDot} style={{ background: item.color }} />
                {item.label}
              </span>
            ))}
            <span className={styles.headerNodeLegendDivider} />
            <span className={styles.headerNodeLegendItem} title="Los nodos críticos o SPOF laten con un resplandor para llamar la atención">
              <span className={styles.glowLegendDot} />
              Crítico / SPOF
            </span>
          </div>
        </div>

        {/* Right — stats + analysis panel toggle */}
        <div className={styles.headerRight}>
          <span className={styles.stat}>{entities.length} entidades</span>
          <span className={styles.stat}>{relations.length} relaciones</span>
          {graph.isPending && <div className={styles.spinner} />}
          <button onClick={() => setShowFilters((p) => !p)} className={showFilters ? styles.analysisBtnActive : styles.analysisBtn}>
            <SlidersHorizontal size={13} /> Filtros
          </button>
          <button onClick={() => setShowAnalysis((p) => !p)} className={showAnalysis ? styles.analysisBtnActive : styles.analysisBtn}>
            <Activity size={13} /> Motores
          </button>
        </div>
      </header>

      <div className={styles.canvasArea}>
        {graph.error && <div className={styles.errorBanner}><AlertTriangle size={13} /> {graph.error}</div>}
        {!graph.data && graph.isPending && (
          <div className={styles.loadingOverlay}><div className={styles.spinnerLg} /><p>Cargando modelo sistémico…</p></div>
        )}

        {graph.data && (
          <Suspense fallback={<div className={styles.loadingOverlay}><div className={styles.spinnerLg} /></div>}>
            <div data-cy-container style={{ width: '100%', height: '100%' }}>
              <ModelCanvas
                entities={entities} relations={relations} canvasState={sm.state} colorMap={colorMap}
                onNodeClick={handleNodeClick} onNodeContextMenu={handleNodeContextMenu} onNodeDblClick={handleNodeDblClick}
                onEdgeDblClick={handleEdgeDblClick} onCanvasClick={handleCanvasClick}
                onCanvasContextMenu={handleCanvasContextMenu}
                onMouseMove={sm.updateMouse}
                onNodeDragStart={sm.startDrag}
                onNodeDragEnd={handleNodeDragEnd}
                onRelationStart={handleRelationStart}
                onRelationHoverChange={sm.hoverRelationTarget}
                onTargetSelected={handleTargetSelected}
                onRelationCancel={handleRelationCancel}
                onPanZoom={handlePanZoom}
                onZoomChange={setZoomLevel}
                onNodeDelete={(id) => void handleNodeDeleteAction(id)}
                onNodeAnalyze={handleNodeAnalyzeAction}
                onNodePickEntity={handleNodePickEntity}
                onNodeDuplicate={(id) => void handleNodeDuplicateAction(id)}
                cyRef={cyRef}
              />
            </div>
          </Suspense>
        )}

        <div className={styles.modeBar}>
          {sm.state.mode === 'idle'              && 'Clic derecho en el lienzo para catálogo de entidades · Clic en un nodo para mostrar conectores'}
          {sm.state.mode === 'node_selected'     && 'Nodo seleccionado · Arrastra desde un conector para crear relación · Doble clic para editar'}
          {sm.state.mode === 'creating_entity'   && 'Creando entidad…'}
          {sm.state.mode === 'creating_relation' && 'Arrastra la línea hacia un destino válido y suelta · Esc para cancelar'}
          {sm.state.mode === 'editing_relation'  && 'Editando relación · Esc para cancelar'}
          {sm.state.mode === 'dragging_node'     && 'Moviendo nodo · suelta para fijar posición'}
          {sm.state.mode === 'panning_canvas'    && 'Moviendo lienzo…'}
        </div>

        {/* Leyenda de fuerza de relación — abajo a la izquierda */}
        <div className={styles.edgeLegend}>
          <span className={styles.edgeLegendTitle}>Fuerza de relación</span>
          {STRENGTH_OPTIONS.map((level) => {
            const s = STRENGTH_STYLE[level];
            return (
              <span key={level} className={styles.edgeLegendItem}>
                <span
                  className={styles.edgeLegendLine}
                  style={{ background: s.color, height: Math.max(2, s.width) }}
                />
                <span className={styles.edgeLegendLabel}>{s.label}</span>
              </span>
            );
          })}
        </div>

      </div>

      {showCatalogDrawer && graph.data && (
        <EntitiesCatalogDrawer
          allEntities={graph.data.allEntities}
          currentEntityIds={new Set(allGraphEntities.map((e) => e.id))}
          entityTypes={graph.data.entityTypes}
          colorMap={colorMap}
          onSelect={handleSelectCatalogEntity}
          onCreate={handleCreateCatalogEntity}
          onEditSave={handleUpdateEntity}
          onDelete={handleNodeDeleteAction}
          onClose={() => { setShowCatalogDrawer(false); setCatalogClickPos(null); }}
        />
      )}

      {sm.state.mode === 'editing_relation' && pendingRelation && pendingSrc && pendingTgt && (
        <RelationFormPopover
          mode="create"
          position={pendingRelation.targetScreenPos}
          sourceEntity={pendingSrc} targetEntity={pendingTgt}
          relationTypes={graph.data?.relationTypes ?? []}
          onSave={handleCreateRelation}
          onCancel={handleRelationCancel}
        />
      )}

      {editingRelation && !pendingRelation && sm.state.mode === 'editing_relation' && (
        <RelationFormPopover
          mode="edit"
          position={edgeEditPos}
          relation={editingRelation}
          sourceEntity={editSrc} targetEntity={editTgt}
          relationTypes={graph.data?.relationTypes ?? []}
          onSave={handleUpdateRelation}
          onDelete={handleDeleteRelation}
          onCancel={() => { setEditingEdgeId(null); setEditingEdgePos(null); sm.deselectEdge(); }}
        />
      )}

      {/* Entity picker — agregar entidad existente desde la tabla */}
      {pickerForNode && graph.data && (() => {
        const rp = cyRef.current?.getElementById(pickerForNode).renderedPosition() as ScreenPos | undefined;
        const r  = document.querySelector('[data-cy-container]')?.getBoundingClientRect();
        const pos: ScreenPos = rp
          ? { x: (r?.left ?? 0) + rp.x, y: (r?.top ?? 0) + rp.y }
          : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        return (
          <EntityPickerPanel
            position={pos}
            allEntities={graph.data.allEntities}
            currentEntityIds={new Set(allGraphEntities.map((e) => e.id))}
            colorMap={colorMap}
            onSelect={handlePickedEntity}
            onCancel={() => setPickerForNode(null)}
          />
        );
      })()}

      {/* Entity edit form — opens on dblclick or ✎ button */}
      {editingEntityId && (() => {
        const ent = entities.find((e) => e.id === editingEntityId);
        if (!ent) return null;
        const pos = sm.state.nodeRenderedPos ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        return (
          <EntityEditForm
            entity={ent}
            position={pos}
            onSave={handleUpdateEntity}
            onDelete={handleDeleteEntityFromForm}
            onCancel={() => setEditingEntityId(null)}
          />
        );
      })()}

      {showAnalysis && (
        <div className={styles.analysisDrawer}>
          <div className={styles.analysisHeader}>
            <span>Motores Elena</span>
            <button onClick={() => setShowAnalysis(false)} className={styles.closeAnalysis}>✕</button>
          </div>
          <AnalysisPanel
            rootEntityId={analysisRootId}
            rootEntityName={analysisRootName}
            scopeEntityIds={visibleEntities.map((entity) => entity.id)}
            onValidate={handleValidateModel}
            onResult={(r) => setElenaResult(r)}
            onGraphRefresh={graph.reload}
          />
        </div>
      )}

      {showFilters && filters.selection && (
        <FiltersDrawer
          rightOffset={showAnalysis ? 280 : 0}
          groups={filters.config?.groups ?? []}
          viewCode={filters.selection.viewCode}
          depth={filters.selection.depth}
          mode={filters.selection.mode}
          criticalityCodes={filters.selection.criticalityCodes}
          isLoading={filters.isLoading}
          isSaving={filters.isSaving}
          error={filters.error}
          onClose={() => setShowFilters(false)}
          onReload={() => void filters.reload()}
          onReset={filters.resetSelection}
          onSelectView={filters.selectView}
          onSelectDepth={filters.selectDepth}
          onSelectMode={filters.selectMode}
          onToggleCriticality={filters.toggleCriticality}
        />
      )}

      <ElenaEngineResultPanel result={elenaResult} onClose={() => setElenaResult(null)} />
    </div>
  );
}

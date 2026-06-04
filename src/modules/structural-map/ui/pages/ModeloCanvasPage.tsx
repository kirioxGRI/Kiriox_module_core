'use client';

import { useRef, useCallback, lazy, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Activity, AlertTriangle } from 'lucide-react';
import { useCanvasStateMachine } from '@/modules/structural-map/ui/hooks/useCanvasStateMachine';
import { useModeloGraph } from '@/modules/structural-map/ui/hooks/useModeloGraph';
import { AnalysisPanel } from '@/modules/structural-map/ui/components/AnalysisPanel';
import { ElenaEngineResultPanel } from '@/modules/structural-map/ui/components/ElenaEngineResultPanel';
import { EntityQuickCreate } from '@/modules/structural-map/ui/components/canvas/EntityQuickCreate';
import { RelationFormPopover } from '@/modules/structural-map/ui/components/canvas/RelationFormPopover';
import type { GraphEntity, GraphRelation } from '@/modules/structural-map/domain/types/GraphTypes';
import type { ScreenPos } from '@/modules/structural-map/domain/types/ModeloTypes';
import type { ElenaRunResult } from '@/modules/structural-map/domain/types/ElenaTypes';
import styles from './ModeloCanvasPage.module.css';

const ModelCanvas = lazy(() => import('@/modules/structural-map/ui/components/canvas/ModelCanvas'));

type PendingRelation = { sourceId: string; targetId: string; targetScreenPos: ScreenPos };

export default function ModeloCanvasPage() {
  const sm    = useCanvasStateMachine();
  const graph = useModeloGraph();
  const cyRef = useRef<cytoscape.Core | null>(null);

  const [pendingRelation, setPendingRelation] = useState<PendingRelation | null>(null);
  const [elenaResult,     setElenaResult]     = useState<ElenaRunResult | null>(null);
  const [showAnalysis,    setShowAnalysis]    = useState(false);
  const [editingEdgeId,   setEditingEdgeId]   = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { sm.escape(); setPendingRelation(null); setEditingEdgeId(null); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sm]);

  const handleCanvasClick = useCallback((screenPos: ScreenPos, graphPos: { x: number; y: number }) => {
    if (sm.state.mode === 'creating_relation') return;
    if (sm.state.mode === 'node_selected' || sm.state.mode === 'editing_relation') { sm.deselect(); return; }
    sm.startCreateEntity(screenPos, graphPos);
  }, [sm]);

  const handleNodeClick = useCallback((entity: GraphEntity, renderedPos: ScreenPos) => {
    if (sm.state.mode === 'creating_relation') return;
    sm.selectNode(entity.id, renderedPos);
  }, [sm]);

  const handleNodeDblClick = useCallback((entity: GraphEntity) => {
    sm.selectNode(entity.id, sm.state.nodeRenderedPos ?? { x: 0, y: 0 });
  }, [sm]);

  const handleEdgeClick = useCallback((relation: GraphRelation) => {
    sm.selectEdge(relation.id);
    setEditingEdgeId(relation.id);
    sm.startCreateEntity({ x: 0, y: 0 }, { x: 0, y: 0 });
    sm.cancelCreateEntity();
  }, [sm]);

  const handleRelationHandleClick = useCallback((sourceId: string) => {
    sm.startCreateRelation(sourceId);
  }, [sm]);

  const handleTargetSelected = useCallback((targetId: string) => {
    if (!sm.state.pendingSourceId) return;
    const rp = cyRef.current?.getElementById(targetId).renderedPosition() as ScreenPos | undefined;
    const r  = document.querySelector('[data-cy-container]')?.getBoundingClientRect();
    const sp: ScreenPos = { x: (r?.left ?? 0) + (rp?.x ?? 0), y: (r?.top ?? 0) + (rp?.y ?? 0) };
    const sourceId = sm.state.pendingSourceId;
    sm.setPendingTarget();
    setPendingRelation({ sourceId, targetId, targetScreenPos: sp });
  }, [sm]);

  const handleCreateEntity = useCallback(async (input: { entity_type_id: string; code: string; name: string; description?: string; criticality_level: string }) => {
    const res  = await fetch('/api/structural-map/entities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const text = await res.text();
    if (!res.ok) throw new Error((JSON.parse(text) as { error?: string }).error ?? 'Error al crear entidad');
    const { id } = JSON.parse(text) as { id: string };
    const et = graph.data?.entityTypes.find((t) => t.id === input.entity_type_id);
    graph.addEntity({
      id, code: input.code, name: input.name, description: input.description ?? null,
      status: 'active', criticality_level: input.criticality_level,
      entity_type_id: input.entity_type_id, entity_type_code: et?.code ?? '', entity_type_name: et?.name ?? '',
      is_active: true, is_spof: false, is_critical_node: false, total_degree: 0,
      criticality_score: null, resilience_score: null, exposure_score: null,
    });
    sm.cancelCreateEntity();
    sm.markDirty();
  }, [graph, sm]);

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
    if (!res.ok) throw new Error('Error al actualizar relación');
    graph.updateRelation(id, patch as Partial<GraphRelation>);
    setEditingEdgeId(null);
    sm.deselectEdge();
  }, [graph, sm]);

  const handleDeleteRelation = useCallback(async (id: string) => {
    const res = await fetch(`/api/structural-map/relations/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar relación');
    graph.removeRelation(id);
    setEditingEdgeId(null);
    sm.deselectEdge();
    sm.markDirty();
  }, [graph, sm]);

  const handlePanZoom = useCallback(() => {
    if (sm.state.selectedNodeId && cyRef.current) {
      const rp = cyRef.current.getElementById(sm.state.selectedNodeId).renderedPosition() as ScreenPos;
      sm.updateNodePos(rp);
    }
  }, [sm]);

  const entities        = graph.data?.entities    ?? [];
  const relations       = graph.data?.relations   ?? [];
  const editingRelation = editingEdgeId ? (relations.find((r) => r.id === editingEdgeId) ?? null) : null;
  const pendingSrc      = pendingRelation ? entities.find((e) => e.id === pendingRelation.sourceId)  : undefined;
  const pendingTgt      = pendingRelation ? entities.find((e) => e.id === pendingRelation.targetId)  : undefined;
  const editSrc         = editingRelation ? entities.find((e) => e.id === editingRelation.source_entity_id) : undefined;
  const editTgt         = editingRelation ? entities.find((e) => e.id === editingRelation.target_entity_id) : undefined;
  const edgeEditPos     = sm.state.clickScreenPos ?? (typeof window !== 'undefined' ? { x: window.innerWidth / 2, y: window.innerHeight / 2 } : { x: 500, y: 400 });

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/gestion/structural-map" className={styles.backBtn}><ChevronLeft size={14} /> Portafolio</Link>
          <span className={styles.pageTitle}>Modelo estructural</span>
          {sm.state.isDirty && <span className={styles.dirtyBadge}>Cambios pendientes de análisis</span>}
        </div>
        <div className={styles.headerRight}>
          <span className={styles.stat}>{entities.length} entidades</span>
          <span className={styles.stat}>{relations.length} relaciones</span>
          {graph.isPending && <div className={styles.spinner} />}
          <button onClick={() => setShowAnalysis((p) => !p)} className={showAnalysis ? styles.analysisBtnActive : styles.analysisBtn}>
            <Activity size={13} /> Análisis
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
                entities={entities} relations={relations} canvasState={sm.state}
                onNodeClick={handleNodeClick} onNodeDblClick={handleNodeDblClick}
                onEdgeClick={handleEdgeClick} onCanvasClick={handleCanvasClick}
                onMouseMove={sm.updateMouse}
                onNodeDragStart={sm.startDrag}
                onNodeDragEnd={() => sm.endDrag()}
                onRelationHandleClick={handleRelationHandleClick}
                onTargetSelected={handleTargetSelected}
                onPanZoom={handlePanZoom}
                cyRef={cyRef}
              />
            </div>
          </Suspense>
        )}

        <div className={styles.modeBar}>
          {sm.state.mode === 'idle'              && 'Clic en el lienzo para crear entidad · Clic en nodo para seleccionar'}
          {sm.state.mode === 'node_selected'     && 'Nodo seleccionado · Usa + para crear relación · Esc para deseleccionar'}
          {sm.state.mode === 'creating_entity'   && 'Creando entidad…'}
          {sm.state.mode === 'creating_relation' && 'Selecciona el nodo destino · Esc para cancelar'}
          {sm.state.mode === 'editing_relation'  && 'Editando relación · Esc para cancelar'}
          {sm.state.mode === 'dragging_node'     && 'Moviendo nodo…'}
        </div>
      </div>

      {sm.state.mode === 'creating_entity' && sm.state.clickScreenPos && (
        <EntityQuickCreate
          position={sm.state.clickScreenPos}
          entityTypes={graph.data?.entityTypes ?? []}
          onSave={handleCreateEntity}
          onCancel={sm.cancelCreateEntity}
        />
      )}

      {sm.state.mode === 'editing_relation' && pendingRelation && pendingSrc && pendingTgt && (
        <RelationFormPopover
          mode="create"
          position={pendingRelation.targetScreenPos}
          sourceEntity={pendingSrc} targetEntity={pendingTgt}
          relationTypes={graph.data?.relationTypes ?? []}
          onSave={handleCreateRelation}
          onCancel={() => { setPendingRelation(null); sm.cancelRelation(); }}
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
          onCancel={() => { setEditingEdgeId(null); sm.deselectEdge(); }}
        />
      )}

      {showAnalysis && (
        <div className={styles.analysisDrawer}>
          <div className={styles.analysisHeader}>
            <span>Motores Elena</span>
            <button onClick={() => setShowAnalysis(false)} className={styles.closeAnalysis}>✕</button>
          </div>
          <AnalysisPanel
            rootEntityId={entities[0]?.id ?? ''}
            rootEntityName="Grafo completo"
            onValidate={async () => null}
            onResult={(r) => setElenaResult(r)}
            onGraphRefresh={graph.reload}
          />
        </div>
      )}

      <ElenaEngineResultPanel result={elenaResult} onClose={() => setElenaResult(null)} />
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Network, ChevronLeft, Layers, Eye, Shield, AlertTriangle, GitBranch, CheckSquare } from 'lucide-react';
import { usePortfolio } from '@/modules/structural-map/ui/hooks/usePortfolio';
import { useServiceGraph } from '@/modules/structural-map/ui/hooks/useServiceGraph';
import { EntityCatalogPanel } from '@/modules/structural-map/ui/components/EntityCatalogPanel';
import { NodeContextPanel } from '@/modules/structural-map/ui/components/NodeContextPanel';
import { AnalysisPanel } from '@/modules/structural-map/ui/components/AnalysisPanel';
import { ElenaEngineResultPanel } from '@/modules/structural-map/ui/components/ElenaEngineResultPanel';
import type { GraphEntity, GraphRelation } from '@/modules/structural-map/domain/types/GraphTypes';
import type { CreateEntityInput } from '@/modules/structural-map/domain/types/PortfolioTypes';
import type { ElenaRunResult } from '@/modules/structural-map/domain/types/ElenaTypes';
import styles from './ServiceBuilderPage.module.css';

const CytoscapeGraph = lazy(() => import('@/modules/structural-map/ui/components/CytoscapeGraph'));

type ActivePanel = 'catalog' | 'analysis';
type Props = { serviceId: string };

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
  const { graph, graphError, isPending, depth, changeDepth, validateModel, addRelation, reload } =
    useServiceGraph(serviceId);

  const [activePanel, setActivePanel]   = useState<ActivePanel>(initTab as ActivePanel);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selected, setSelected]         = useState<GraphEntity | GraphRelation | null>(null);
  const [simHighlight, setSimHighlight] = useState<Set<string>>(new Set());
  const [elenaResult, setElenaResult]   = useState<ElenaRunResult | null>(null);

  const service      = portfolio?.services.find((s) => s.id === serviceId);
  const entityTypes  = portfolio?.entityTypes  ?? [];
  const relationTypes = portfolio?.relationTypes ?? [];

  useEffect(() => {
    if (searchParams.get('tab') === 'analysis') setActivePanel('analysis');
  }, [searchParams]);

  const highlightedIds =
    activeFilter === 'critical' ? new Set(graph?.entities.filter((e) => e.is_critical_node).map((e) => e.id) ?? [])
    : activeFilter === 'spof'   ? new Set(graph?.entities.filter((e) => e.is_spof).map((e) => e.id) ?? [])
    : simHighlight.size > 0 && activeFilter === 'cascade' ? simHighlight
    : undefined;

  const handleNodeClick = useCallback((entity: GraphEntity)   => { setSelected(entity); },   []);
  const handleEdgeClick = useCallback((relation: GraphRelation) => { setSelected(relation); }, []);

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
    reload();
  }, [reload]);

  const entityCount   = graph?.entities.length  ?? 0;
  const relationCount = graph?.relations.length ?? 0;

  return (
    <div className={styles.layout}>
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
                entities={graph?.entities ?? []}
                rootEntityId={serviceId}
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
        <main className={styles.centerPane}>
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
          {graph && (
            <Suspense fallback={<div className={styles.graphLoading}><div className={styles.spinnerLg} /></div>}>
              <CytoscapeGraph
                data={graph}
                rootEntityId={serviceId}
                selectedNodeId={selected && !('source_entity_id' in selected) ? selected.id : null}
                highlightedIds={highlightedIds}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
              />
            </Suspense>
          )}
          {graph && (
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
        </main>

        {/* Right: node context */}
        <aside className={styles.rightPane}>
          <div className={styles.paneHeader}>Panel contextual</div>
          <NodeContextPanel
            selected={selected}
            entities={graph?.entities ?? []}
            onDeleteRelation={handleDeleteRelation}
            onSimulateNode={handleSimulateNode}
          />
        </aside>
      </div>

      {/* Elena result drawer — rendered as overlay above everything */}
      <ElenaEngineResultPanel
        result={elenaResult}
        onClose={() => setElenaResult(null)}
      />
    </div>
  );
}

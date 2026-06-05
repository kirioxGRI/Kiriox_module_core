'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, AlertTriangle, CheckCircle2, Activity, Shield, Zap, GitBranch, Eye, Sparkles, Loader2 } from 'lucide-react';
import type { ElenaRunResult, ElenaMetricRow, ElenaCascadeRow } from '@/modules/structural-map/domain/types/ElenaTypes';
import { isChromAiAvailable, runKirioxAi } from '@/shared/ai';
import styles from './ElenaEngineResultPanel.module.css';

type Props = {
  result: ElenaRunResult | null;
  onClose: () => void;
};

const ENGINE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  structural:  { label: 'Análisis estructural',   icon: Activity,      color: '#6366f1' },
  criticality: { label: 'Análisis de criticidad', icon: Zap,           color: '#f87171' },
  resilience:  { label: 'Análisis de resiliencia',icon: Shield,        color: '#4ade80' },
  exposure:    { label: 'Análisis de exposición', icon: AlertTriangle, color: '#fb923c' },
  cascade:     { label: 'Simulación de cascada',  icon: GitBranch,     color: '#a78bfa' },
};

const LEVEL_COLORS: Record<string, string> = {
  critical: '#f87171', high: '#fb923c', medium: '#fbbf24', low: '#4ade80',
  ORIGIN: '#6366f1', DIRECT: '#f87171', INDIRECT: '#fb923c',
};

function fmtScore(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toFixed(2);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('es', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function KpiCard({ label, value, color, sub }: { label: string; value: React.ReactNode; color?: string; sub?: string }) {
  const c = color ?? '#94a3b8';
  return (
    <div className={styles.kpiCard} style={{ borderColor: `${c}30`, background: `${c}08` }}>
      <span className={styles.kpiVal} style={{ color: c }}>{value}</span>
      <span className={styles.kpiLbl}>{label}</span>
      {sub && <span className={styles.kpiSub}>{sub}</span>}
    </div>
  );
}

function LevelBadge({ level }: { level: string | null | undefined }) {
  if (!level) return <span className={styles.naText}>—</span>;
  const c = LEVEL_COLORS[level.toLowerCase()] ?? LEVEL_COLORS[level] ?? '#94a3b8';
  return (
    <span className={styles.levelBadge} style={{ background: `${c}18`, borderColor: `${c}44`, color: c }}>
      {level}
    </span>
  );
}

function BoolCell({ val }: { val: boolean | null | undefined }) {
  if (val == null) return <span className={styles.naText}>—</span>;
  return (
    <span style={{ color: val ? '#f87171' : '#4ade80', fontWeight: 700, fontSize: '0.72rem' }}>
      {val ? '✓' : '—'}
    </span>
  );
}

function numFromDetails(details: Record<string, unknown> | null | undefined, key: string): number | null {
  const value = details?.[key];
  return typeof value === 'number' ? value : null;
}

function boolFromDetails(details: Record<string, unknown> | null | undefined, key: string): boolean | null {
  const value = details?.[key];
  return typeof value === 'boolean' ? value : null;
}

type StructuralFragilityInsight = {
  topNodeName: string;
  topNodeScore: number | null;
  topNodeDependents: number | null;
  topNodeDependencies: number | null;
  topNodeDegree: number | null;
  spofNodes: string[];
  mostConnectedName: string;
  mostConnectedDegree: number | null;
  deepestName: string;
  deepestDistance: number | null;
};

function deriveStructuralFragilityInsight(rows: ElenaMetricRow[]): StructuralFragilityInsight {
  const criticalityRows = rows
    .filter((row) => row.metric_type === 'criticality')
    .sort((a, b) => (b.metric_value ?? 0) - (a.metric_value ?? 0));

  const topNode = criticalityRows[0];
  const topNodeName = topNode?.entity_name ?? topNode?.entity_code ?? '—';
  const topNodeDependents = numFromDetails(topNode?.metric_details, 'dependents');
  const topNodeDependencies = numFromDetails(topNode?.metric_details, 'dependencies');
  const topNodeDegree = numFromDetails(topNode?.metric_details, 'total_degree');

  const spofNodes = rows
    .filter((row) => row.metric_type === 'spof' && ((row.metric_value ?? 0) > 0 || boolFromDetails(row.metric_details, 'possible_spof')))
    .map((row) => row.entity_name ?? row.entity_code);

  const degreeRows = rows
    .filter((row) => row.metric_type === 'degree_centrality')
    .sort((a, b) => (b.metric_value ?? 0) - (a.metric_value ?? 0));

  const mostConnectedNode = degreeRows[0];
  const mostConnectedName = mostConnectedNode?.entity_name ?? mostConnectedNode?.entity_code ?? '—';
  const mostConnectedDegree = mostConnectedNode?.metric_value ?? null;

  const depthRows = rows
    .filter((row) => row.metric_type === 'dependency_depth')
    .sort((a, b) => (b.metric_value ?? 0) - (a.metric_value ?? 0));

  const deepestNode = depthRows[0];
  const deepestName = deepestNode?.entity_name ?? deepestNode?.entity_code ?? '—';
  const deepestDistance = deepestNode?.metric_value ?? null;

  return {
    topNodeName,
    topNodeScore: topNode?.metric_value ?? null,
    topNodeDependents,
    topNodeDependencies,
    topNodeDegree,
    spofNodes,
    mostConnectedName,
    mostConnectedDegree,
    deepestName,
    deepestDistance,
  };
}

function StructuralFragilityCard({ insight }: { insight: StructuralFragilityInsight }) {
  const {
    topNodeName,
    topNodeScore,
    topNodeDependents,
    topNodeDependencies,
    topNodeDegree,
    spofNodes,
    mostConnectedName,
    mostConnectedDegree,
    deepestName,
    deepestDistance,
  } = insight;

  return (
    <section className={styles.insightCard}>
      <p className={styles.insightEyebrow}>Fragilidad estructural</p>
      <h3 className={styles.insightQuestion}>¿Dónde está la fragilidad estructural del grafo evaluado?</h3>
      <p className={styles.insightAnswer}>
        {topNodeScore != null
          ? <>La mayor fragilidad se concentra en <strong>{topNodeName}</strong>, con score estructural <strong>{fmtScore(topNodeScore)}</strong>{topNodeDependents != null ? <> y <strong>{topNodeDependents}</strong> dependiente{topNodeDependents === 1 ? '' : 's'} directo{topNodeDependents === 1 ? '' : 's'}</> : null}{topNodeDependencies != null ? <> sobre <strong>{topNodeDependencies}</strong> dependencia{topNodeDependencies === 1 ? '' : 's'}</> : null}{topNodeDegree != null ? <> y grado total <strong>{topNodeDegree}</strong></> : null}.</>
          : <>No se detectaron métricas suficientes para localizar la fragilidad principal del subgrafo.</>
        }
      </p>

      <div className={styles.insightFacts}>
        <div className={styles.insightFact}>
          <span className={styles.insightLabel}>Puntos únicos de falla</span>
          <strong className={styles.insightValue}>{spofNodes.length}</strong>
          <span className={styles.insightNote}>
            {spofNodes.length > 0 ? spofNodes.slice(0, 3).join(', ') : 'No se detectaron SPOF'}
          </span>
        </div>
        <div className={styles.insightFact}>
          <span className={styles.insightLabel}>Mayor concentración</span>
          <strong className={styles.insightValue}>{mostConnectedName}</strong>
          <span className={styles.insightNote}>
            {mostConnectedDegree != null ? `grado ${fmtScore(mostConnectedDegree)}` : 'Sin dato de centralidad'}
          </span>
        </div>
        <div className={styles.insightFact}>
          <span className={styles.insightLabel}>Nodo más profundo</span>
          <strong className={styles.insightValue}>{deepestName}</strong>
          <span className={styles.insightNote}>
            {deepestDistance != null ? `distancia ${fmtScore(deepestDistance)} desde la raíz` : 'Sin dato de profundidad'}
          </span>
        </div>
      </div>
    </section>
  );
}

async function runStructuralRecommendationAi(insight: StructuralFragilityInsight): Promise<string> {
  const input = [
    `Nodo más frágil: ${insight.topNodeName}.`,
    insight.topNodeScore != null ? `Score estructural: ${fmtScore(insight.topNodeScore)}.` : '',
    insight.topNodeDependents != null ? `Dependientes directos: ${insight.topNodeDependents}.` : '',
    insight.topNodeDependencies != null ? `Dependencias: ${insight.topNodeDependencies}.` : '',
    insight.topNodeDegree != null ? `Grado total: ${insight.topNodeDegree}.` : '',
    `SPOF detectados: ${insight.spofNodes.length}.`,
    insight.spofNodes.length ? `Nodos SPOF: ${insight.spofNodes.slice(0, 5).join(', ')}.` : '',
    `Mayor concentración: ${insight.mostConnectedName}${insight.mostConnectedDegree != null ? ` con grado ${fmtScore(insight.mostConnectedDegree)}` : ''}.`,
    `Nodo más profundo: ${insight.deepestName}${insight.deepestDistance != null ? ` a distancia ${fmtScore(insight.deepestDistance)}` : ''}.`,
    'Genera una recomendación ejecutiva única para reducir la fragilidad estructural del grafo, priorizando la acción más importante.',
  ].filter(Boolean).join(' ');

  const result = await runKirioxAi({
    module: 'structural-risk',
    field: 'structural_fragility_recommendation',
    intent: 'complete',
    tone: 'ejecutivo',
    output: 'text',
    minWords: 20,
    maxWords: 60,
    requiredMeaning: ['fragilidad estructural', 'acción prioritaria', 'redundancia o control'],
    input,
  });

  return result.value;
}

function StructuralTable({ rows }: { rows: ElenaMetricRow[] }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {['Entidad', 'Tipo', 'Métrica', 'Score', 'Nivel', 'In', 'Out', 'Grado', 'Deps', 'Dep.de', 'SPOF'].map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.entity_id}-${r.metric_type}-${i}`}>
            <td><span className={styles.entityName}>{r.entity_name ?? r.entity_code}</span></td>
            <td><span className={styles.typePill}>{r.entity_type_name}</span></td>
            <td><span className={styles.metricType}>{r.metric_type ?? '—'}</span></td>
            <td className={styles.scoreCell}>{fmtScore(r.metric_value)}</td>
            <td><LevelBadge level={r.metric_level} /></td>
            <td>{r.incoming_count ?? '—'}</td>
            <td>{r.outgoing_count ?? '—'}</td>
            <td>{r.total_degree ?? '—'}</td>
            <td>{r.dependency_count ?? '—'}</td>
            <td>{r.dependent_count ?? '—'}</td>
            <td><BoolCell val={r.is_spof} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CriticalityTable({ rows }: { rows: ElenaMetricRow[] }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {['Entidad', 'Tipo', 'Score', 'Nivel', 'Crítico', 'Grado', 'Deps', 'Dep.de', 'Riesgos', 'Controles', 'Cascada'].map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.entity_id}-${i}`}>
            <td>
              <span className={styles.entityName}>{r.entity_name ?? r.entity_code}</span>
              {r.is_critical_node && <span className={styles.critBadge}>CRÍTICO</span>}
            </td>
            <td><span className={styles.typePill}>{r.entity_type_name}</span></td>
            <td className={styles.scoreCell}>{fmtScore(r.criticality_score)}</td>
            <td><LevelBadge level={r.criticality_level} /></td>
            <td><BoolCell val={r.is_critical_node} /></td>
            <td>{r.total_degree ?? '—'}</td>
            <td>{r.dependency_count ?? '—'}</td>
            <td>{r.dependent_count ?? '—'}</td>
            <td className={r.risk_count && r.risk_count > 0 ? styles.warnCell : ''}>{r.risk_count ?? '—'}</td>
            <td>{r.control_count ?? '—'}</td>
            <td className={styles.scoreCell}>{fmtScore(r.cascade_exposure_score)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ResilienceTable({ rows }: { rows: ElenaMetricRow[] }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {['Entidad', 'Tipo', 'Resiliencia', 'Nivel', 'Fragilidad', 'SPOF', 'Brecha', 'Soportes', 'Alt.'].map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.entity_id}-${i}`}>
            <td><span className={styles.entityName}>{r.entity_name ?? r.entity_code}</span></td>
            <td><span className={styles.typePill}>{r.entity_type_name}</span></td>
            <td className={styles.scoreCell}>{fmtScore(r.resilience_score)}</td>
            <td><LevelBadge level={r.resilience_level} /></td>
            <td className={styles.scoreCell}>{fmtScore(r.fragility_score)}</td>
            <td>{r.is_spof ? <span className={styles.spofBadge}>SPOF</span> : '—'}</td>
            <td>{r.has_resilience_gap ? <span className={styles.gapBadge}>GAP</span> : '—'}</td>
            <td>{r.support_count ?? '—'}</td>
            <td>{r.alternative_support_count ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ExposureTable({ rows }: { rows: ElenaMetricRow[] }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {['Entidad', 'Tipo', 'Exposición', 'Nivel', 'Brecha', 'Sin control', 'Riesgos', 'Controles', 'Obligaciones', 'Datos', 'Incidentes'].map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.entity_id}-${i}`}>
            <td><span className={styles.entityName}>{r.entity_name ?? r.entity_code}</span></td>
            <td><span className={styles.typePill}>{r.entity_type_name}</span></td>
            <td className={styles.scoreCell}>{fmtScore(r.exposure_score)}</td>
            <td><LevelBadge level={r.exposure_level} /></td>
            <td>{r.has_exposure_gap ? <span className={styles.gapBadge}>GAP</span> : '—'}</td>
            <td className={r.uncontrolled_risk_count && r.uncontrolled_risk_count > 0 ? styles.warnCell : ''}>{r.uncontrolled_risk_count ?? '—'}</td>
            <td>{r.risk_count ?? '—'}</td>
            <td>{r.control_count ?? '—'}</td>
            <td>{r.obligation_count ?? '—'}</td>
            <td>{r.data_count ?? '—'}</td>
            <td>{r.incident_count ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CascadeTable({ rows }: { rows: ElenaCascadeRow[] }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {['Entidad afectada', 'Tipo', 'Nivel impacto', 'Score', 'Profundidad', 'Origen', 'Razón', 'Acción sugerida'].map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.entity_id}-${i}`} style={{ background: r.is_origin ? 'rgba(99,102,241,0.06)' : undefined }}>
            <td>
              <span className={styles.entityName}>{r.entity_name ?? r.entity_code}</span>
              {r.is_origin && <span className={styles.originBadge}>ORIGEN</span>}
            </td>
            <td><span className={styles.typePill}>{r.entity_type_name}</span></td>
            <td><LevelBadge level={r.impact_level} /></td>
            <td className={styles.scoreCell}>{fmtScore(r.impact_score)}</td>
            <td style={{ textAlign: 'center' }}>{r.impact_depth}</td>
            <td><BoolCell val={r.is_origin} /></td>
            <td className={styles.reasonCell}>{r.impact_reason ? <span title={r.impact_reason} style={{ cursor: 'help' }}><Eye size={11} /></span> : '—'}</td>
            <td className={styles.reasonCell}>{r.recommended_action ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SummaryKpis({ result }: { result: ElenaRunResult }) {
  const { summary, engine } = result;
  const meta = ENGINE_META[engine] ?? ENGINE_META.structural;

  const kpis: { label: string; value: React.ReactNode; color?: string; sub?: string }[] = [
    { label: 'Entidades analizadas', value: summary.totalEntities, color: meta.color },
  ];

  if (engine === 'structural') {
    kpis.push(
      { label: 'SPOF detectados', value: summary.spofCount ?? 0, color: '#fb923c' },
      { label: 'Score promedio', value: fmtScore(summary.avgScore), color: '#a78bfa' },
      { label: 'Score máximo', value: fmtScore(summary.maxScore), color: '#f87171' },
    );
  } else if (engine === 'criticality') {
    kpis.push(
      { label: 'Nodos críticos', value: summary.criticalNodeCount ?? 0, color: '#f87171' },
      { label: 'Score promedio', value: fmtScore(summary.avgScore), color: '#a78bfa' },
      { label: 'Score máximo', value: fmtScore(summary.maxScore), color: '#f87171' },
    );
  } else if (engine === 'resilience') {
    kpis.push(
      { label: 'SPOF detectados', value: summary.spofCount ?? 0, color: '#fb923c' },
      { label: 'Brechas de resiliencia', value: summary.resilienceGaps ?? 0, color: '#fbbf24' },
      { label: 'Resiliencia promedio', value: fmtScore(summary.avgScore), color: '#4ade80' },
    );
  } else if (engine === 'exposure') {
    kpis.push(
      { label: 'Brechas de exposición', value: summary.exposureGaps ?? 0, color: '#fb923c' },
      { label: 'Riesgos sin control', value: summary.maxScore ?? 0, color: '#f87171' },
      { label: 'Exposición promedio', value: fmtScore(summary.avgScore), color: '#fbbf24' },
    );
  } else if (engine === 'cascade') {
    kpis.push(
      { label: 'Entidades afectadas', value: summary.affectedCount ?? 0, color: '#f87171' },
      { label: 'Afectados directos', value: summary.directAffected ?? 0, color: '#fb923c', sub: 'profundidad 1' },
      { label: 'Afectados indirectos', value: summary.indirectAffected ?? 0, color: '#fbbf24', sub: 'profundidad 2+' },
      { label: 'Profundidad máxima', value: summary.maxDepth ?? 0, color: '#a78bfa' },
    );
  }

  return (
    <div className={styles.kpiRow}>
      {kpis.map(({ label, value, color, sub }) => (
        <KpiCard key={label} label={label} value={value} color={color} sub={sub} />
      ))}
    </div>
  );
}

export function ElenaEngineResultPanel({ result, onClose }: Props) {
  const [recommendation, setRecommendation] = useState<string>('');
  const [recommendationStatus, setRecommendationStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [recommendationError, setRecommendationError] = useState<string>('');

  const engine = result?.engine ?? 'structural';
  const meta = ENGINE_META[engine] ?? ENGINE_META.structural;
  const Icon = meta.icon;

  const rows = result?.rows ?? [];
  const isCascade = engine === 'cascade';
  const structuralInsight = useMemo(
    () => engine === 'structural' ? deriveStructuralFragilityInsight(rows as ElenaMetricRow[]) : null,
    [engine, rows],
  );

  useEffect(() => {
    setRecommendation('');
    setRecommendationStatus('idle');
    setRecommendationError('');
  }, [result?.runId, engine]);

  if (!result) return null;

  async function handleRecommendation() {
    if (!structuralInsight) return;
    if (!isChromAiAvailable()) {
      setRecommendationError('Chrome AI no disponible. Requiere Chrome 127+ con Gemini Nano.');
      setRecommendationStatus('error');
      return;
    }

    setRecommendationStatus('loading');
    setRecommendationError('');

    try {
      const value = await runStructuralRecommendationAi(structuralInsight);
      setRecommendation(value);
      setRecommendationStatus('done');
    } catch (error) {
      setRecommendation('');
      setRecommendationStatus('error');
      setRecommendationError(error instanceof Error ? error.message : 'No se pudo generar la recomendación.');
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.drawer}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.engineIcon} style={{ background: `${meta.color}18`, borderColor: `${meta.color}44` }}>
              <Icon size={16} color={meta.color} />
            </div>
            <div>
              <h2 className={styles.headerTitle}>Resultado — {meta.label}</h2>
              <p className={styles.headerSub}>
                <span className={styles.fnName}>{result.functionName}</span>
                {result.runId && <span className={styles.runId}>run: {result.runId.slice(0, 12)}…</span>}
              </p>
            </div>
          </div>
          <div className={styles.headerRight}>
            {result.ok
              ? <CheckCircle2 size={16} color="#4ade80" />
              : <AlertTriangle size={16} color="#f87171" />}
            <span className={styles.execAt}>{fmtDate(result.executedAt)}</span>
            <button onClick={onClose} className={styles.closeBtn} title="Cerrar">
              <X size={16} />
            </button>
          </div>
        </header>

        <div className={styles.body}>
          {!result.ok && result.error && (
            <div className={styles.errorBlock}>
              <AlertTriangle size={14} />
              <div>
                <p className={styles.errorTitle}>El motor no pudo ejecutarse</p>
                <p className={styles.errorDetail}>{result.error}</p>
                <p className={styles.errorMeta}>Función: {result.functionName}</p>
              </div>
            </div>
          )}

          {result.ok && (
            <>
              <div className={styles.metaRow}>
                {result.summary.rootEntityName && (
                  <span className={styles.rootEntity}>Nodo raíz: <strong>{result.summary.rootEntityName}</strong></span>
                )}
                {result.summary.scenario && (
                  <span className={styles.scenarioBadge}>Escenario: {result.summary.scenario}</span>
                )}
              </div>

              <SummaryKpis result={result} />

              {rows.length === 0 ? (
                <div className={styles.emptyRows}>
                  <p>El análisis se ejecutó pero no produjo registros.</p>
                  <p className={styles.emptyHint}>Es posible que el grafo no tenga entidades conectadas al nodo raíz.</p>
                </div>
              ) : result.engine === 'structural' ? (
                <>
                  <StructuralFragilityCard insight={structuralInsight!} />
                  <div className={styles.recommendationBlock}>
                    <button
                      type="button"
                      onClick={() => void handleRecommendation()}
                      disabled={recommendationStatus === 'loading'}
                      className={styles.recommendationBtn}
                      title={!isChromAiAvailable() ? 'Chrome AI no disponible' : 'Generar recomendación con IA local'}
                    >
                      {recommendationStatus === 'loading' ? <Loader2 size={14} className={styles.spinIcon} /> : <Sparkles size={14} />}
                      Recomendación
                    </button>
                    {recommendationError && (
                      <p className={styles.recommendationError}>{recommendationError}</p>
                    )}
                    {recommendation && (
                      <section className={styles.recommendationCard}>
                        <p className={styles.recommendationEyebrow}>Recomendación IA</p>
                        <p className={styles.recommendationText}>{recommendation}</p>
                      </section>
                    )}
                  </div>
                </>
              ) : (
                <div className={styles.tableSection}>
                  <p className={styles.tableTitle}>
                    Detalle — {rows.length} registro{rows.length !== 1 ? 's' : ''}
                  </p>
                  <div className={styles.tableWrap}>
                    {isCascade
                      ? <CascadeTable rows={rows as ElenaCascadeRow[]} />
                      : result.engine === 'criticality'
                          ? <CriticalityTable rows={rows as ElenaMetricRow[]} />
                          : result.engine === 'resilience'
                            ? <ResilienceTable rows={rows as ElenaMetricRow[]} />
                            : <ExposureTable rows={rows as ElenaMetricRow[]} />
                    }
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

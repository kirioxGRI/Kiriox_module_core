'use client';

import { X, AlertTriangle, CheckCircle2, Activity, Shield, Zap, GitBranch, Eye } from 'lucide-react';
import type { ElenaRunResult, ElenaMetricRow, ElenaCascadeRow } from '@/modules/structural-map/domain/types/ElenaTypes';
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
  if (!result) return null;

  const meta = ENGINE_META[result.engine] ?? ENGINE_META.structural;
  const Icon = meta.icon;

  const rows = result.rows;
  const isCascade = result.engine === 'cascade';

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
              ) : (
                <div className={styles.tableSection}>
                  <p className={styles.tableTitle}>
                    Detalle — {rows.length} registro{rows.length !== 1 ? 's' : ''}
                  </p>
                  <div className={styles.tableWrap}>
                    {isCascade
                      ? <CascadeTable rows={rows as ElenaCascadeRow[]} />
                      : result.engine === 'structural'
                        ? <StructuralTable rows={rows as ElenaMetricRow[]} />
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

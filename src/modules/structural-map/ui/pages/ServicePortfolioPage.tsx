'use client';

import { useEffect, useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Network, Activity, Shield, AlertTriangle, Zap, Play, GitBranch, Database, BarChart3 } from 'lucide-react';
import { usePortfolio } from '@/modules/structural-map/ui/hooks/usePortfolio';
import type { AnalysisRunRow, MetricRow } from '@/modules/structural-map/infrastructure/PrismaPortfolioRepository';
import styles from './ServicePortfolioPage.module.css';

const ANALYSIS_LABELS: Record<string, string> = {
  full_structural_analysis:     'Estructural',
  critical_nodes_analysis:      'Criticidad',
  resilience_analysis:          'Resiliencia',
  structural_exposure_analysis: 'Exposición',
  cascade_simulation:           'Cascada',
};

const STATUS_COLORS: Record<string, string> = {
  completed: '#4ade80',
  running:   '#fbbf24',
  failed:    '#f87171',
  pending:   '#94a3b8',
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtScore(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toFixed(2);
}

function StatusDot({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? '#94a3b8';
  return <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: c, marginRight: 5, flexShrink: 0 }} />;
}

function AnalysisRunsCard({ runs, loading }: { runs: AnalysisRunRow[]; loading: boolean }) {
  return (
    <div className={styles.dataCard}>
      <div className={styles.dataCardHeader}>
        <div className={styles.dataCardTitle}>
          <Database size={14} color="#818cf8" />
          <span>systemic_structural_analysis_runs</span>
        </div>
        <span className={styles.dataCardSub}>7 últimas ejecuciones</span>
      </div>

      {loading && <div className={styles.dataCardLoading}><div className={styles.spinner} /> Cargando…</div>}

      {!loading && runs.length === 0 && (
        <div className={styles.dataCardEmpty}>No hay ejecuciones registradas aún</div>
      )}

      {!loading && runs.length > 0 && (
        <div className={styles.dataGrid}>
          <div className={styles.dataGridHead}>
            <span>Nombre</span>
            <span>Tipo</span>
            <span>Estado</span>
            <span>Completado</span>
          </div>
          {runs.map((r) => (
            <div key={r.id} className={styles.dataGridRow}>
              <span className={styles.runName} title={r.name}>{r.name}</span>
              <span className={styles.typePill}>{ANALYSIS_LABELS[r.analysis_type] ?? r.analysis_type}</span>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <StatusDot status={r.status} />
                <span style={{ color: STATUS_COLORS[r.status] ?? '#94a3b8', fontSize: '0.68rem', fontWeight: 700 }}>{r.status}</span>
              </span>
              <span className={styles.dateCell}>{fmtDate(r.completed_at ?? r.started_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricsCard({ metrics, loading }: { metrics: MetricRow[]; loading: boolean }) {
  return (
    <div className={styles.dataCard}>
      <div className={styles.dataCardHeader}>
        <div className={styles.dataCardTitle}>
          <BarChart3 size={14} color="#34d399" />
          <span>systemic_structural_metrics</span>
        </div>
        <span className={styles.dataCardSub}>7 últimas métricas</span>
      </div>

      {loading && <div className={styles.dataCardLoading}><div className={styles.spinner} /> Cargando…</div>}

      {!loading && metrics.length === 0 && (
        <div className={styles.dataCardEmpty}>No hay métricas calculadas aún</div>
      )}

      {!loading && metrics.length > 0 && (
        <div className={styles.dataGrid}>
          <div className={styles.dataGridHead}>
            <span>Entidad</span>
            <span>Métrica</span>
            <span>Valor</span>
            <span>Nivel</span>
            <span>Crítico</span>
            <span>SPOF</span>
          </div>
          {metrics.map((m, i) => (
            <div key={`${m.id}-${i}`} className={styles.dataGridRow}>
              <span className={styles.entityCell}>
                <span className={styles.entityName}>{m.entity_name ?? m.entity_code}</span>
                <span className={styles.entityType}>{m.entity_type_name}</span>
              </span>
              <span className={styles.metricType}>{m.metric_type ?? '—'}</span>
              <span className={styles.scoreCell}>{fmtScore(m.criticality_score ?? m.metric_value)}</span>
              <span>
                {(m.criticality_level ?? m.metric_level) ? (
                  <span className={styles.levelBadge}>{m.criticality_level ?? m.metric_level}</span>
                ) : '—'}
              </span>
              <span style={{ color: m.is_critical_node ? '#f87171' : '#334155', fontWeight: 800, fontSize: '0.7rem' }}>
                {m.is_critical_node ? '✓' : '—'}
              </span>
              <span style={{ color: m.is_spof ? '#fb923c' : '#334155', fontWeight: 800, fontSize: '0.7rem' }}>
                {m.is_spof ? '✓' : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ServicePortfolioPage() {
  const router                    = useRouter();
  const { data, error, isPending } = usePortfolio();
  const [runs, setRuns]           = useState<AnalysisRunRow[]>([]);
  const [metrics, setMetrics]     = useState<MetricRow[]>([]);
  const [runsLoading, startRuns]  = useTransition();
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');

  useEffect(() => {
    startRuns(async () => {
      try {
        const res  = await fetch('/api/structural-map/portfolio-runs', { cache: 'no-store' });
        const text = await res.text();
        if (!res.ok || !text) return;
        const payload = JSON.parse(text) as { analysis_runs: AnalysisRunRow[]; metrics: MetricRow[] };
        setRuns(payload.analysis_runs ?? []);
        setMetrics(payload.metrics ?? []);
      } catch { /* noop */ }
    });
  }, []);

  const services = data?.services ?? [];

  return (
    <main className={styles.page}>
      <div className={styles.glowA} />
      <div className={styles.glowB} />

      <div className={styles.content}>
        {/* Hero */}
        <section className={styles.heroSection}>
          <div className={styles.heroLeft}>
            <div className={styles.kickerRow}>
              <div className={styles.iconWrap}><Network size={18} color="#818cf8" /></div>
              <span className={styles.kicker}>Kiriox GRI · Structural Map</span>
            </div>
            <h1 className={styles.heroTitle}>Service Portfolio</h1>
            <p className={styles.heroLead}>
              Construye, valida, analiza y simula modelos estructurales de dependencias organizacionales.
            </p>
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                className={styles.entityCombo}
              >
                {(data?.allEntities ?? [])
                  .slice()
                  .sort((a, b) => String(a.name ?? a.code).localeCompare(String(b.name ?? b.code)))
                  .map((e: { id: string; name?: string; code?: string }) => (
                    <option key={e.id} value={e.id}>{e.name ?? e.code}</option>
                  ))
                }
                <option value="">Toda entidad</option>
              </select>
              <button
                onClick={() => {
                  const path = selectedEntityId
                    ? `/gestion/structural-map/modelo?serviceId=${selectedEntityId}`
                    : '/gestion/structural-map/modelo';
                  router.push(path);
                }}
                className={styles.openModelBtn}
              >
                <Play size={13} fill="currentColor" /> Abrir Modelo Estructural
              </button>
            </div>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatVal}>{services.length}</span>
              <span className={styles.heroStatLbl}>Servicios</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatVal}>{runs.length > 0 ? runs.length : '—'}</span>
              <span className={styles.heroStatLbl}>Análisis recientes</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatVal}>{metrics.filter((m) => m.is_critical_node).length}</span>
              <span className={styles.heroStatLbl}>Nodos críticos</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatVal}>{metrics.filter((m) => m.is_spof).length}</span>
              <span className={styles.heroStatLbl}>SPOF</span>
            </div>
          </div>
        </section>

        {error && (
          <div className={styles.errorBanner}><AlertTriangle size={14} /> {error}</div>
        )}

        {isPending && !data && (
          <div className={styles.loadingBanner}><div className={styles.spinner} /> Cargando portafolio…</div>
        )}

        {/* Two data cards */}
        <div className={styles.dataCardsRow}>
          <AnalysisRunsCard runs={runs}    loading={runsLoading} />
          <MetricsCard      metrics={metrics} loading={runsLoading} />
        </div>

        {/* Legend */}
        <section className={styles.legend}>
          <div className={styles.legendTitle}>Leyenda de indicadores</div>
          <div className={styles.legendItems}>
            {[
              { icon: Zap,           color: '#f87171', label: 'Nodo crítico — alto impacto si falla' },
              { icon: Shield,        color: '#fb923c', label: 'SPOF — punto único de falla sin alternativa' },
              { icon: Activity,      color: '#4ade80', label: 'Resiliencia — capacidad de recuperarse' },
              { icon: AlertTriangle, color: '#fbbf24', label: 'Exposición — riesgos no controlados' },
              { icon: GitBranch,     color: '#a78bfa', label: 'Cascada — propagación de fallo en cadena' },
            ].map(({ icon: Icon, color, label }) => (
              <div key={label} className={styles.legendItem}>
                <Icon size={12} color={color} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

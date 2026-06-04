'use client';

import Link from 'next/link';
import { Network, Activity, Shield, AlertTriangle, Zap, ChevronRight, Play, GitBranch } from 'lucide-react';
import { usePortfolio } from '@/modules/structural-map/ui/hooks/usePortfolio';
import type { ServiceSummary } from '@/modules/structural-map/domain/types/PortfolioTypes';
import styles from './ServicePortfolioPage.module.css';

const CRIT_COLORS: Record<string, string> = { critical: '#f87171', high: '#fb923c', medium: '#fbbf24', low: '#4ade80' };
const ANALYSIS_LABELS: Record<string, string> = {
  full_structural_analysis:     'Estructural',
  critical_nodes_analysis:      'Criticidad',
  resilience_analysis:          'Resiliencia',
  structural_exposure_analysis: 'Exposición',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ScoreBar({ label, value, color }: { label: string; value: number | null; color: string }) {
  if (value == null) return <div style={{ color: '#334155', fontSize: '0.65rem' }}>{label}: N/A</div>;
  const pct = Math.max(0, Math.min(100, value * 10));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ color: '#64748b', fontSize: '0.62rem', fontWeight: 600 }}>{label}</span>
        <span style={{ color, fontSize: '0.62rem', fontWeight: 800 }}>{value.toFixed(1)}</span>
      </div>
      <div style={{ height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.05)' }}>
        <div style={{ height: '100%', borderRadius: 999, background: color, width: `${pct}%`, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

function ServiceCard({ svc }: { svc: ServiceSummary }) {
  const critColor = CRIT_COLORS[svc.criticality_level ?? 'medium'] ?? '#94a3b8';
  return (
    <article className={styles.serviceCard}>
      <div className={styles.cardGlow} style={{ background: `radial-gradient(circle at 30% 30%, ${critColor}15, transparent 65%)` }} />

      <div className={styles.cardHeader}>
        <div className={styles.serviceIcon} style={{ background: `${critColor}18`, borderColor: `${critColor}44` }}>
          <Network size={16} color={critColor} />
        </div>
        <div className={styles.serviceInfo}>
          <h3 className={styles.serviceName}>{svc.name}</h3>
          <span className={styles.serviceCode}>{svc.code}</span>
        </div>
        <span className={styles.critBadge} style={{ background: `${critColor}18`, borderColor: `${critColor}44`, color: critColor }}>
          {svc.criticality_level ?? 'N/A'}
        </span>
      </div>

      {svc.description && <p className={styles.serviceDesc}>{svc.description}</p>}

      <div className={styles.kpiRow}>
        <div className={styles.kpi}>
          <span className={styles.kpiVal}>{svc.entity_count}</span>
          <span className={styles.kpiLbl}>Entidades</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiVal}>{svc.relation_count}</span>
          <span className={styles.kpiLbl}>Relaciones</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiVal} style={{ color: svc.critical_nodes > 0 ? '#f87171' : '#f1f5f9' }}>{svc.critical_nodes}</span>
          <span className={styles.kpiLbl}>Críticos</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiVal} style={{ color: svc.spof_count > 0 ? '#fb923c' : '#f1f5f9' }}>{svc.spof_count}</span>
          <span className={styles.kpiLbl}>SPOF</span>
        </div>
      </div>

      <div className={styles.scoresWrap}>
        <ScoreBar label="Criticidad" value={svc.criticality_score} color="#f87171" />
        <ScoreBar label="Resiliencia" value={svc.resilience_score}  color="#4ade80" />
        <ScoreBar label="Exposición" value={svc.exposure_score}     color="#fb923c" />
      </div>

      {svc.last_analysis_at && (
        <p className={styles.lastAnalysis}>
          Último análisis: {ANALYSIS_LABELS[svc.last_analysis_type ?? ''] ?? svc.last_analysis_type ?? '—'} · {fmtDate(svc.last_analysis_at)}
        </p>
      )}

      <div className={styles.cardActions}>
        <Link href={`/gestion/structural-map/${svc.id}`} className={styles.primaryAction}>
          <Play size={12} fill="currentColor" /> Abrir modelo
          <ChevronRight size={12} />
        </Link>
        <Link href={`/gestion/structural-map/${svc.id}?tab=analysis`} className={styles.secondaryAction}>
          <Activity size={12} /> Analizar
        </Link>
        <Link href={`/gestion/structural-map/${svc.id}?tab=simulation`} className={styles.secondaryAction}>
          <GitBranch size={12} /> Simular
        </Link>
      </div>
    </article>
  );
}

export default function ServicePortfolioPage() {
  const { data, error, isPending } = usePortfolio();
  const services = data?.services ?? [];

  return (
    <main className={styles.page}>
      <div className={styles.glowA} />
      <div className={styles.glowB} />

      <div className={styles.content}>
        <section className={styles.heroSection}>
          <div className={styles.heroLeft}>
            <div className={styles.kickerRow}>
              <div className={styles.iconWrap}><Network size={18} color="#818cf8" /></div>
              <span className={styles.kicker}>Kiriox GRI · Structural Map</span>
            </div>
            <h1 className={styles.heroTitle}>Service Portfolio</h1>
            <p className={styles.heroLead}>
              Selecciona un servicio para construir, validar, analizar y simular su modelo estructural de dependencias.
            </p>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatVal}>{services.length}</span>
              <span className={styles.heroStatLbl}>Servicios</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatVal}>{services.reduce((a, s) => a + s.critical_nodes, 0)}</span>
              <span className={styles.heroStatLbl}>Nodos críticos</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatVal}>{services.reduce((a, s) => a + s.spof_count, 0)}</span>
              <span className={styles.heroStatLbl}>SPOF totales</span>
            </div>
          </div>
        </section>

        {error && (
          <div className={styles.errorBanner}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {isPending && !data && (
          <div className={styles.loadingBanner}>
            <div className={styles.spinner} />
            Cargando portafolio de servicios…
          </div>
        )}

        {data && services.length === 0 && (
          <div className={styles.emptyState}>
            <Network size={32} color="#334155" />
            <p>No hay servicios registrados en el modelo sistémico.</p>
            <p className={styles.emptyHint}>Crea entidades de tipo SERVICE en la base de datos para comenzar.</p>
          </div>
        )}

        <div className={styles.grid}>
          {services.map((svc) => <ServiceCard key={svc.id} svc={svc} />)}
        </div>

        <section className={styles.legend}>
          <div className={styles.legendTitle}>Leyenda de indicadores</div>
          <div className={styles.legendItems}>
            {[
              { icon: Zap,           color: '#f87171', label: 'Nodo crítico — alto impacto si falla' },
              { icon: Shield,        color: '#fb923c', label: 'SPOF — punto único de falla sin alternativa' },
              { icon: Activity,      color: '#4ade80', label: 'Resiliencia — capacidad de recuperarse' },
              { icon: AlertTriangle, color: '#fbbf24', label: 'Exposición — riesgos no controlados' },
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

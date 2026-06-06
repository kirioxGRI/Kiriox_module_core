import type { ExposureInsight } from './exposureInsight';
import styles from './ElenaEngineResultPanel.module.css';

function fmtScore(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toFixed(2);
}

export function ExposureRiskCard({ insight }: { insight: ExposureInsight }) {
  const {
    mostExposedName,
    mostExposedScore,
    mostExposedLevel,
    mostExposedUncontrolled,
    mostExposedRisks,
    exposureGapCount,
    totalUncontrolledRisks,
    avgExposure,
    leastExposedName,
    leastExposedScore,
  } = insight;

  return (
    <section className={styles.insightCard}>
      <p className={styles.insightEyebrow}>Exposición estructural</p>
      <h3 className={styles.insightQuestion}>¿Qué tan expuesto está el sistema y dónde se concentra la exposición?</h3>
      <p className={styles.insightAnswer}>
        {mostExposedScore != null
          ? (
            <>
              La mayor exposición está en <strong>{mostExposedName}</strong>, con score <strong>{fmtScore(mostExposedScore)}</strong>
              {mostExposedLevel ? <> (nivel <strong>{mostExposedLevel}</strong>)</> : null}
              {mostExposedRisks != null ? <>, alcanza <strong>{mostExposedRisks}</strong> riesgo{mostExposedRisks === 1 ? '' : 's'}</> : null}
              {mostExposedUncontrolled != null && mostExposedUncontrolled > 0
                ? <>, de los cuales <strong>{mostExposedUncontrolled}</strong> sin control</>
                : null}.
            </>
          )
          : <>No se detectaron métricas de exposición suficientes en el subgrafo visible.</>
        }
      </p>

      <div className={styles.insightFacts}>
        <div className={styles.insightFact}>
          <span className={styles.insightLabel}>Brechas de exposición</span>
          <strong className={styles.insightValue}>{exposureGapCount}</strong>
          <span className={styles.insightNote}>
            {avgExposure != null ? `exposición promedio ${fmtScore(avgExposure)}` : 'sin promedio disponible'}
          </span>
        </div>
        <div className={styles.insightFact}>
          <span className={styles.insightLabel}>Riesgos sin control</span>
          <strong className={styles.insightValue}>{totalUncontrolledRisks}</strong>
          <span className={styles.insightNote}>
            {totalUncontrolledRisks > 0 ? 'expuestos sin mitigación' : 'todos los riesgos tienen control'}
          </span>
        </div>
        <div className={styles.insightFact}>
          <span className={styles.insightLabel}>Nodo menos expuesto</span>
          <strong className={styles.insightValue}>{leastExposedName}</strong>
          <span className={styles.insightNote}>
            {leastExposedScore != null ? `exposición ${fmtScore(leastExposedScore)}` : 'sin dato'}
          </span>
        </div>
      </div>
    </section>
  );
}

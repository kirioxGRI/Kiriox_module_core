import type { ResilienceInsight } from './resilienceInsight';
import styles from './ElenaEngineResultPanel.module.css';

function fmtScore(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toFixed(2);
}

export function ResilienceFragilityCard({ insight }: { insight: ResilienceInsight }) {
  const {
    mostFragileName,
    mostFragileResilience,
    mostFragileFragility,
    mostFragileLevel,
    mostFragileIsSpof,
    mostFragileAltSupport,
    spofNodes,
    resilienceGapCount,
    avgResilience,
    strongestName,
    strongestResilience,
  } = insight;

  return (
    <section className={styles.insightCard}>
      <p className={styles.insightEyebrow}>Resiliencia estructural</p>
      <h3 className={styles.insightQuestion}>¿Qué tan resiliente es el subgrafo y dónde está la mayor fragilidad?</h3>
      <p className={styles.insightAnswer}>
        {mostFragileResilience != null
          ? (
            <>
              El punto más frágil es <strong>{mostFragileName}</strong>, con resiliencia <strong>{fmtScore(mostFragileResilience)}</strong>
              {mostFragileFragility != null ? <> y fragilidad <strong>{fmtScore(mostFragileFragility)}</strong></> : null}
              {mostFragileLevel ? <> (nivel <strong>{mostFragileLevel}</strong>)</> : null}
              {mostFragileIsSpof
                ? <>, además es <strong>punto único de falla</strong></>
                : mostFragileAltSupport === 0 ? <>, sin soportes alternativos</> : null}.
            </>
          )
          : <>No se detectaron métricas de resiliencia suficientes en el subgrafo visible.</>
        }
      </p>

      <div className={styles.insightFacts}>
        <div className={styles.insightFact}>
          <span className={styles.insightLabel}>Puntos únicos de falla</span>
          <strong className={styles.insightValue}>{spofNodes.length}</strong>
          <span className={styles.insightNote}>
            {spofNodes.length > 0 ? spofNodes.slice(0, 3).join(', ') : 'Sin SPOF en el scope'}
          </span>
        </div>
        <div className={styles.insightFact}>
          <span className={styles.insightLabel}>Brechas de resiliencia</span>
          <strong className={styles.insightValue}>{resilienceGapCount}</strong>
          <span className={styles.insightNote}>
            {avgResilience != null ? `resiliencia promedio ${fmtScore(avgResilience)}` : 'sin promedio disponible'}
          </span>
        </div>
        <div className={styles.insightFact}>
          <span className={styles.insightLabel}>Nodo más resiliente</span>
          <strong className={styles.insightValue}>{strongestName}</strong>
          <span className={styles.insightNote}>
            {strongestResilience != null ? `resiliencia ${fmtScore(strongestResilience)}` : 'sin dato'}
          </span>
        </div>
      </div>
    </section>
  );
}

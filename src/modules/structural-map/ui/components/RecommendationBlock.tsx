import { Loader2, Sparkles } from 'lucide-react';
import styles from './ElenaEngineResultPanel.module.css';

type Props = {
  status: 'idle' | 'loading' | 'done' | 'error';
  error: string;
  recommendation: string;
  aiAvailable: boolean;
  onGenerate: () => void;
};

/**
 * Bloque presentacional de recomendación IA (botón + skeleton + resultado).
 * Compartido por todos los motores Elena para mantener una sola fuente de UX
 * y respetar el límite de tamaño del panel.
 */
export function RecommendationBlock({ status, error, recommendation, aiAvailable, onGenerate }: Props) {
  return (
    <div className={styles.recommendationBlock}>
      <button
        type="button"
        onClick={onGenerate}
        disabled={status === 'loading'}
        className={styles.recommendationBtn}
        title={!aiAvailable ? 'Chrome AI no disponible' : 'Generar recomendación con IA local'}
      >
        {status === 'loading' ? <Loader2 size={14} className={styles.spinIcon} /> : <Sparkles size={14} />}
        Recomendación
      </button>

      {error && <p className={styles.recommendationError}>{error}</p>}

      {status === 'loading' && (
        <section className={styles.recommendationLoadingCard} aria-live="polite" aria-busy="true">
          <div className={styles.recommendationLoadingHeader}>
            <span className={styles.recommendationEyebrow}>Recomendación IA</span>
            <span className={styles.recommendationLoadingDots}>
              <span />
              <span />
              <span />
            </span>
          </div>
          <div className={styles.recommendationSkeletonLine} />
          <div className={styles.recommendationSkeletonLine} />
          <div className={styles.recommendationSkeletonLineShort} />
        </section>
      )}

      {recommendation && (
        <section className={styles.recommendationCard}>
          <p className={styles.recommendationEyebrow}>Recomendación IA</p>
          <p className={styles.recommendationText}>{recommendation}</p>
        </section>
      )}
    </div>
  );
}

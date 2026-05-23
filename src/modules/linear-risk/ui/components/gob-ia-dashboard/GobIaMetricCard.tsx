import type { GobIaMetric } from "../../pages/gobIaDashboard.mock";
import styles from "./GobIaMetricCard.module.css";

type GobIaMetricCardProps = {
  metric: GobIaMetric;
};

export default function GobIaMetricCard({ metric }: GobIaMetricCardProps) {
  return (
    <article className={`${styles.card} ${styles[metric.tone]}`}>
      <p className={styles.label}>{metric.label}</p>
      <strong className={styles.value}>{metric.value}</strong>
      <span className={styles.detail}>{metric.detail}</span>
    </article>
  );
}

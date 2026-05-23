import type { ContinuidadMetric } from "../../pages/continuidadDashboard.data";
import styles from "./ContinuidadMetricCard.module.css";

type ContinuidadMetricCardProps = {
  metric: ContinuidadMetric;
};

export default function ContinuidadMetricCard({ metric }: ContinuidadMetricCardProps) {
  return (
    <article className={`${styles.card} ${styles[metric.tone]}`}>
      <p className={styles.label}>{metric.label}</p>
      <strong className={styles.value}>{metric.value}</strong>
      <span className={styles.detail}>{metric.detail}</span>
    </article>
  );
}

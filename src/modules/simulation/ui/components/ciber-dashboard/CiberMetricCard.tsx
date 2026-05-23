import type { CiberMetric } from "../../pages/ciberDashboard.mock";
import styles from "./CiberMetricCard.module.css";

type CiberMetricCardProps = {
  metric: CiberMetric;
};

export default function CiberMetricCard({ metric }: CiberMetricCardProps) {
  return (
    <article className={`${styles.card} ${styles[metric.tone]}`}>
      <p className={styles.label}>{metric.label}</p>
      <strong className={styles.value}>{metric.value}</strong>
      <span className={styles.detail}>{metric.detail}</span>
    </article>
  );
}

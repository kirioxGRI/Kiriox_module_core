import type { PlaftMetric } from "../../pages/plaftDashboard.mock";
import styles from "./PlaftMetricCard.module.css";

type PlaftMetricCardProps = {
  metric: PlaftMetric;
};

export default function PlaftMetricCard({ metric }: PlaftMetricCardProps) {
  return (
    <article className={`${styles.card} ${styles[metric.tone]}`}>
      <p className={styles.label}>{metric.label}</p>
      <strong className={styles.value}>{metric.value}</strong>
      <span className={styles.detail}>{metric.detail}</span>
    </article>
  );
}

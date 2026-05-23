import type { PlaftAlert } from "../../pages/plaftDashboard.mock";
import styles from "./PlaftAlertFeed.module.css";

type PlaftAlertFeedProps = {
  alerts: PlaftAlert[];
};

export default function PlaftAlertFeed({ alerts }: PlaftAlertFeedProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Alertas priorizadas</p>
          <h2 className={styles.title}>Señales para atención inmediata</h2>
        </div>
      </div>

      <div className={styles.list}>
        {alerts.map((alert) => (
          <article key={alert.id} className={styles.item}>
            <div className={`${styles.severity} ${styles[alert.severity]}`}>{alert.severity}</div>
            <div className={styles.body}>
              <div className={styles.topline}>
                <strong>{alert.title}</strong>
                <span>{alert.id}</span>
              </div>
              <p>{alert.description}</p>
              <span className={styles.owner}>{alert.owner}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

import type { CiberThreat } from "../../pages/ciberDashboard.mock";
import styles from "./CiberThreatFeed.module.css";

type CiberThreatFeedProps = {
  threats: CiberThreat[];
};

export default function CiberThreatFeed({ threats }: CiberThreatFeedProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Amenazas prioritarias</p>
          <h2 className={styles.title}>Eventos mock para atención inmediata</h2>
        </div>
      </div>

      <div className={styles.list}>
        {threats.map((threat) => (
          <article key={threat.id} className={styles.item}>
            <div className={`${styles.severity} ${styles[threat.severity]}`}>{threat.severity}</div>
            <div className={styles.body}>
              <div className={styles.topline}>
                <strong>{threat.title}</strong>
                <span>{threat.id}</span>
              </div>
              <p>{threat.signal}</p>
              <span className={styles.vector}>{threat.vector}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

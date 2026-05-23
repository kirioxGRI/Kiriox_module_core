import type { GobIaRisk } from "../../pages/gobIaDashboard.mock";
import styles from "./GobIaRiskFeed.module.css";

type GobIaRiskFeedProps = {
  risks: GobIaRisk[];
};

export default function GobIaRiskFeed({ risks }: GobIaRiskFeedProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Riesgos prioritarios</p>
          <h2 className={styles.title}>Señales críticas de gobierno algorítmico</h2>
        </div>
      </div>

      <div className={styles.list}>
        {risks.map((risk) => (
          <article key={risk.id} className={styles.item}>
            <div className={`${styles.severity} ${styles[risk.severity]}`}>{risk.severity}</div>
            <div className={styles.body}>
              <div className={styles.topline}>
                <strong>{risk.title}</strong>
                <span>{risk.id}</span>
              </div>
              <p>{risk.signal}</p>
              <span className={styles.domain}>{risk.domain}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

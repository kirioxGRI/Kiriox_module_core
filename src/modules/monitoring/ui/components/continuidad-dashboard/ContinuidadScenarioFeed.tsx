import type { ContinuidadScenario } from "../../pages/continuidadDashboard.data";
import styles from "./ContinuidadScenarioFeed.module.css";

type ContinuidadScenarioFeedProps = {
  scenarios: ContinuidadScenario[];
};

export default function ContinuidadScenarioFeed({ scenarios }: ContinuidadScenarioFeedProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Escenarios priorizados</p>
          <h2 className={styles.title}>Interrupciones que requieren atención</h2>
        </div>
      </div>

      <div className={styles.list}>
        {scenarios.map((scenario) => (
          <article key={scenario.id} className={styles.item}>
            <div className={`${styles.severity} ${styles[scenario.severity]}`}>{scenario.severity}</div>
            <div className={styles.body}>
              <div className={styles.topline}>
                <strong>{scenario.title}</strong>
                <span>{scenario.id}</span>
              </div>
              <p>{scenario.signal}</p>
              <span className={styles.process}>{scenario.process}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

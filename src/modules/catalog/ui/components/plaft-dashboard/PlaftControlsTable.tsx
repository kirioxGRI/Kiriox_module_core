import type { PlaftControl } from "../../pages/plaftDashboard.mock";
import styles from "./PlaftControlsTable.module.css";

type PlaftControlsTableProps = {
  controls: PlaftControl[];
};

export default function PlaftControlsTable({ controls }: PlaftControlsTableProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Controles mock</p>
          <h2 className={styles.title}>Cobertura y eficacia de primera línea</h2>
        </div>
      </div>

      <div className={styles.table}>
        {controls.map((control) => (
          <article key={control.name} className={styles.row}>
            <div className={styles.nameBlock}>
              <strong>{control.name}</strong>
              <p>{control.gap}</p>
            </div>

            <div className={styles.metricBlock}>
              <span>Cobertura</span>
              <strong>{control.coverage}%</strong>
              <div className={styles.track}>
                <div className={styles.coverageFill} style={{ width: `${control.coverage}%` }} />
              </div>
            </div>

            <div className={styles.metricBlock}>
              <span>Eficacia</span>
              <strong>{control.effectiveness}%</strong>
              <div className={styles.track}>
                <div className={styles.effectivenessFill} style={{ width: `${control.effectiveness}%` }} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

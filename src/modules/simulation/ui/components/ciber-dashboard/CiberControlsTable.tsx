import type { CiberControl } from "../../pages/ciberDashboard.mock";
import styles from "./CiberControlsTable.module.css";

type CiberControlsTableProps = {
  controls: CiberControl[];
};

export default function CiberControlsTable({ controls }: CiberControlsTableProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Controles mock</p>
          <h2 className={styles.title}>Cobertura defensiva y resiliencia</h2>
        </div>
      </div>

      <div className={styles.table}>
        {controls.map((control) => (
          <article key={control.name} className={styles.row}>
            <div className={styles.nameBlock}>
              <strong>{control.name}</strong>
              <p>{control.note}</p>
            </div>

            <div className={styles.metricBlock}>
              <span>Cobertura</span>
              <strong>{control.coverage}%</strong>
              <div className={styles.track}>
                <div className={styles.coverageFill} style={{ width: `${control.coverage}%` }} />
              </div>
            </div>

            <div className={styles.metricBlock}>
              <span>Resiliencia</span>
              <strong>{control.resilience}%</strong>
              <div className={styles.track}>
                <div className={styles.resilienceFill} style={{ width: `${control.resilience}%` }} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

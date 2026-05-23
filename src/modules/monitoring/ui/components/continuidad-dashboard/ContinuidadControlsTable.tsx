import type { ContinuidadControl } from "../../pages/continuidadDashboard.data";
import styles from "./ContinuidadControlsTable.module.css";

type ContinuidadControlsTableProps = {
  controls: ContinuidadControl[];
};

export default function ContinuidadControlsTable({ controls }: ContinuidadControlsTableProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Capacidades clave</p>
          <h2 className={styles.title}>Cobertura y nivel de preparación</h2>
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
              <span>Preparación</span>
              <strong>{control.readiness}%</strong>
              <div className={styles.track}>
                <div className={styles.readinessFill} style={{ width: `${control.readiness}%` }} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

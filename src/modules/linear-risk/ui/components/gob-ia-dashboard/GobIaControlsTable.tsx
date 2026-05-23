import type { GobIaControl } from "../../pages/gobIaDashboard.mock";
import styles from "./GobIaControlsTable.module.css";

type GobIaControlsTableProps = {
  controls: GobIaControl[];
};

export default function GobIaControlsTable({ controls }: GobIaControlsTableProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Controles mock</p>
          <h2 className={styles.title}>Madurez y cobertura del marco de IA</h2>
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
              <span>Madurez</span>
              <strong>{control.maturity}%</strong>
              <div className={styles.track}>
                <div className={styles.maturityFill} style={{ width: `${control.maturity}%` }} />
              </div>
            </div>

            <div className={styles.metricBlock}>
              <span>Cobertura</span>
              <strong>{control.coverage}%</strong>
              <div className={styles.track}>
                <div className={styles.coverageFill} style={{ width: `${control.coverage}%` }} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

import type { PlaftCase } from "../../pages/plaftDashboard.mock";
import styles from "./PlaftCaseQueue.module.css";

type PlaftCaseQueueProps = {
  cases: PlaftCase[];
};

const statusLabels: Record<PlaftCase["status"], string> = {
  en_analisis: "En análisis",
  pendiente_evidencia: "Pendiente evidencia",
  escalado_uif: "Escalado UIF",
};

export default function PlaftCaseQueue({ cases }: PlaftCaseQueueProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Cola operativa</p>
          <h2 className={styles.title}>Casos mock en seguimiento</h2>
        </div>
      </div>

      <div className={styles.table}>
        <div className={styles.tableHead}>
          <span>Sujeto</span>
          <span>Segmento</span>
          <span>Estado</span>
          <span>Aging</span>
        </div>

        {cases.map((item) => (
          <div key={item.id} className={styles.row}>
            <div>
              <strong>{item.subject}</strong>
              <span>{item.id}</span>
            </div>
            <span>{item.segment}</span>
            <span className={`${styles.status} ${styles[item.status]}`}>{statusLabels[item.status]}</span>
            <strong className={styles.aging}>{item.aging}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

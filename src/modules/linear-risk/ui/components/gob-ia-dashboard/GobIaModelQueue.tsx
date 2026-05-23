import type { GobIaModel } from "../../pages/gobIaDashboard.mock";
import styles from "./GobIaModelQueue.module.css";

type GobIaModelQueueProps = {
  models: GobIaModel[];
};

const statusLabels: Record<GobIaModel["status"], string> = {
  aprobado: "Aprobado",
  monitoreo: "Monitoreo",
  en_revision: "En revisión",
};

export default function GobIaModelQueue({ models }: GobIaModelQueueProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Pipeline de modelos</p>
          <h2 className={styles.title}>Inventario mock con estado de gobierno</h2>
        </div>
      </div>

      <div className={styles.table}>
        <div className={styles.tableHead}>
          <span>Modelo</span>
          <span>Propósito</span>
          <span>Estado</span>
          <span>Owner</span>
        </div>

        {models.map((item) => (
          <div key={item.id} className={styles.row}>
            <div>
              <strong>{item.name}</strong>
              <span>{item.id}</span>
            </div>
            <span>{item.purpose}</span>
            <span className={`${styles.status} ${styles[item.status]}`}>{statusLabels[item.status]}</span>
            <strong className={styles.owner}>{item.owner}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

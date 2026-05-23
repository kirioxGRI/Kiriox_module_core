import type { ContinuidadDependency } from "../../pages/continuidadDashboard.data";
import styles from "./ContinuidadDependencyQueue.module.css";

type ContinuidadDependencyQueueProps = {
  dependencies: ContinuidadDependency[];
};

const statusLabels: Record<ContinuidadDependency["status"], string> = {
  vulnerable: "Vulnerable",
  estable: "Estable",
  seguimiento: "Seguimiento",
};

export default function ContinuidadDependencyQueue({ dependencies }: ContinuidadDependencyQueueProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Dependencias críticas</p>
          <h2 className={styles.title}>Seguimiento de soporte esencial</h2>
        </div>
      </div>

      <div className={styles.table}>
        <div className={styles.tableHead}>
          <span>Dependencia</span>
          <span>Dominio</span>
          <span>Estado</span>
          <span>Owner</span>
        </div>

        {dependencies.map((item) => (
          <div key={item.id} className={styles.row}>
            <div>
              <strong>{item.name}</strong>
              <span>{item.id}</span>
            </div>
            <span>{item.domain}</span>
            <span className={`${styles.status} ${styles[item.status]}`}>{statusLabels[item.status]}</span>
            <strong className={styles.owner}>{item.owner}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

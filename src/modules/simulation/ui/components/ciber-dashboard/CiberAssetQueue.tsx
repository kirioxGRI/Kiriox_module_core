import type { CiberAsset } from "../../pages/ciberDashboard.mock";
import styles from "./CiberAssetQueue.module.css";

type CiberAssetQueueProps = {
  assets: CiberAsset[];
};

const statusLabels: Record<CiberAsset["status"], string> = {
  expuesto: "Expuesto",
  endurecido: "Endurecido",
  observacion: "Observación",
};

export default function CiberAssetQueue({ assets }: CiberAssetQueueProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Activos críticos</p>
          <h2 className={styles.title}>Inventario mock con postura actual</h2>
        </div>
      </div>

      <div className={styles.table}>
        <div className={styles.tableHead}>
          <span>Activo</span>
          <span>Dominio</span>
          <span>Estado</span>
          <span>Owner</span>
        </div>

        {assets.map((item) => (
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

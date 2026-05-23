import { ShieldAlert, Radar, FileSearch } from "lucide-react";
import styles from "./PlaftHero.module.css";

export default function PlaftHero() {
  return (
    <section className={styles.hero}>
      <div className={styles.copy}>
        <div className={styles.badge}>
          <ShieldAlert size={16} />
          <span>Dashboard mock de cumplimiento PLAFT</span>
        </div>

        <div>
          <h1 className={styles.title}>Prevención, monitoreo y trazabilidad regulatoria en una sola vista</h1>
          <p className={styles.description}>
            Prototipo visual para ilustrar cómo Kiriox puede consolidar alertas, casos, cobertura de controles y
            señales de exposición residual PLAFT sin impactar aún flujos productivos ni contratos de datos.
          </p>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelRow}>
          <Radar size={18} />
          <span>Monitoreo transaccional priorizado por criticidad</span>
        </div>
        <div className={styles.panelRow}>
          <FileSearch size={18} />
          <span>Trazabilidad de debida diligencia, casos y escalamiento regulatorio</span>
        </div>
      </div>
    </section>
  );
}

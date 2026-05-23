import { Shield, Radar, ScanEye } from "lucide-react";
import styles from "./CiberHero.module.css";

export default function CiberHero() {
  return (
    <section className={styles.hero}>
      <div className={styles.copy}>
        <div className={styles.badge}>
          <Shield size={16} />
          <span>Dashboard mock de ciberseguridad</span>
        </div>

        <div>
          <h1 className={styles.title}>Superficie de ataque, amenazas y resiliencia operativa</h1>
          <p className={styles.description}>
            Prototipo visual para mostrar cómo Kiriox puede integrar activos críticos, amenazas priorizadas,
            controles defensivos y exposición residual cibernética sin depender todavía de telemetría productiva.
          </p>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelRow}>
          <Radar size={18} />
          <span>Vigilancia de perímetro, identidad, red interna y activos críticos</span>
        </div>
        <div className={styles.panelRow}>
          <ScanEye size={18} />
          <span>Trazabilidad mock de vulnerabilidades, endurecimiento y capacidad de respuesta</span>
        </div>
      </div>
    </section>
  );
}

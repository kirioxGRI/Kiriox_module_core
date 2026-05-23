import { BrainCircuit, ShieldCheck, ScanSearch } from "lucide-react";
import styles from "./GobIaHero.module.css";

export default function GobIaHero() {
  return (
    <section className={styles.hero}>
      <div className={styles.copy}>
        <div className={styles.badge}>
          <BrainCircuit size={16} />
          <span>Dashboard mock de Gobierno de IA</span>
        </div>

        <div>
          <h1 className={styles.title}>Gobernanza, control y vigilancia de modelos críticos</h1>
          <p className={styles.description}>
            Prototipo visual para mostrar cómo Kiriox puede concentrar inventario de modelos, señales de drift,
            riesgos éticos, trazabilidad y cobertura de controles sin depender aún de fuentes productivas.
          </p>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelRow}>
          <ShieldCheck size={18} />
          <span>Controles sobre trazabilidad, aprobación, monitoreo y accountability</span>
        </div>
        <div className={styles.panelRow}>
          <ScanSearch size={18} />
          <span>Foco en sesgo, explicabilidad, drift y uso responsable de IA</span>
        </div>
      </div>
    </section>
  );
}

import { ShieldCheck, Network, Workflow } from "lucide-react";
import { GovernanceCloseButton } from "@/shared/ui/GovernanceCloseButton";
import styles from "./ContinuidadHero.module.css";

export default function ContinuidadHero() {
  return (
    <section className={styles.hero}>
      <div className={styles.copy}>
        <GovernanceCloseButton href="/main_dashboard" />

        <div className={styles.badge}>
          <ShieldCheck size={16} />
          <span>Continuidad de negocios</span>
        </div>

        <div>
          <h1 className={styles.title}>Resiliencia operativa, dependencias críticas y capacidad de recuperación</h1>
          <p className={styles.description}>
            Vista ejecutiva para consolidar procesos críticos, escenarios de interrupción, dependencias sensibles,
            planes de continuidad y nivel de preparación operativa.
          </p>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelRow}>
          <Network size={18} />
          <span>Seguimiento de terceros, infraestructura y puntos únicos de falla</span>
        </div>
        <div className={styles.panelRow}>
          <Workflow size={18} />
          <span>Visibilidad sobre BIA, RTO, pruebas, recuperación y escalamiento</span>
        </div>
      </div>
    </section>
  );
}

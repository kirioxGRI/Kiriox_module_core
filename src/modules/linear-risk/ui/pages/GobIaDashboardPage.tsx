import GobIaControlsTable from "../components/gob-ia-dashboard/GobIaControlsTable";
import GobIaHero from "../components/gob-ia-dashboard/GobIaHero";
import GobIaMetricCard from "../components/gob-ia-dashboard/GobIaMetricCard";
import GobIaModelQueue from "../components/gob-ia-dashboard/GobIaModelQueue";
import GobIaRiskFeed from "../components/gob-ia-dashboard/GobIaRiskFeed";
import { gobIaControls, gobIaMetrics, gobIaModels, gobIaRisks } from "./gobIaDashboard.mock";
import styles from "./GobIaDashboardPage.module.css";

export default function GobIaDashboardPage() {
  return (
    <div className={styles.page}>
      <div className={styles.glowTop} />
      <div className={styles.glowBottom} />

      <div className={styles.shell}>
        <GobIaHero />

        <section className={styles.metricsGrid}>
          {gobIaMetrics.map((metric) => (
            <GobIaMetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        <section className={styles.contentGrid}>
          <GobIaRiskFeed risks={gobIaRisks} />
          <GobIaModelQueue models={gobIaModels} />
        </section>

        <GobIaControlsTable controls={gobIaControls} />
      </div>
    </div>
  );
}

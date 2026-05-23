import ContinuidadControlsTable from "../components/continuidad-dashboard/ContinuidadControlsTable";
import ContinuidadDependencyQueue from "../components/continuidad-dashboard/ContinuidadDependencyQueue";
import ContinuidadHero from "../components/continuidad-dashboard/ContinuidadHero";
import ContinuidadMetricCard from "../components/continuidad-dashboard/ContinuidadMetricCard";
import ContinuidadScenarioFeed from "../components/continuidad-dashboard/ContinuidadScenarioFeed";
import {
  continuidadControls,
  continuidadDependencies,
  continuidadMetrics,
  continuidadScenarios,
} from "./continuidadDashboard.data";
import styles from "./ContinuidadDashboardPage.module.css";

export default function ContinuidadDashboardPage() {
  return (
    <div className={styles.page}>
      <div className={styles.glowTop} />
      <div className={styles.glowBottom} />

      <div className={styles.shell}>
        <ContinuidadHero />

        <section className={styles.metricsGrid}>
          {continuidadMetrics.map((metric) => (
            <ContinuidadMetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        <section className={styles.contentGrid}>
          <ContinuidadScenarioFeed scenarios={continuidadScenarios} />
          <ContinuidadDependencyQueue dependencies={continuidadDependencies} />
        </section>

        <ContinuidadControlsTable controls={continuidadControls} />
      </div>
    </div>
  );
}

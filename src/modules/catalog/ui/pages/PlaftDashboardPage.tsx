import PlaftAlertFeed from "../components/plaft-dashboard/PlaftAlertFeed";
import PlaftCaseQueue from "../components/plaft-dashboard/PlaftCaseQueue";
import PlaftControlsTable from "../components/plaft-dashboard/PlaftControlsTable";
import PlaftHero from "../components/plaft-dashboard/PlaftHero";
import PlaftMetricCard from "../components/plaft-dashboard/PlaftMetricCard";
import { plaftAlerts, plaftCases, plaftControls, plaftMetrics } from "./plaftDashboard.mock";
import styles from "./PlaftDashboardPage.module.css";

export default function PlaftDashboardPage() {
  return (
    <div className={styles.page}>
      <div className={styles.glowTop} />
      <div className={styles.glowBottom} />

      <div className={styles.shell}>
        <PlaftHero />

        <section className={styles.metricsGrid}>
          {plaftMetrics.map((metric) => (
            <PlaftMetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        <section className={styles.contentGrid}>
          <PlaftAlertFeed alerts={plaftAlerts} />
          <PlaftCaseQueue cases={plaftCases} />
        </section>

        <PlaftControlsTable controls={plaftControls} />
      </div>
    </div>
  );
}

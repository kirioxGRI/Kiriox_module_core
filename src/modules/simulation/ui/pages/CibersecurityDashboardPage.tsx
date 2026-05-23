import CiberAssetQueue from "../components/ciber-dashboard/CiberAssetQueue";
import CiberControlsTable from "../components/ciber-dashboard/CiberControlsTable";
import CiberHero from "../components/ciber-dashboard/CiberHero";
import CiberMetricCard from "../components/ciber-dashboard/CiberMetricCard";
import CiberThreatFeed from "../components/ciber-dashboard/CiberThreatFeed";
import { ciberAssets, ciberControls, ciberMetrics, ciberThreats } from "./ciberDashboard.mock";
import styles from "./CibersecurityDashboardPage.module.css";

export default function CibersecurityDashboardPage() {
  return (
    <div className={styles.page}>
      <div className={styles.glowTop} />
      <div className={styles.glowBottom} />

      <div className={styles.shell}>
        <CiberHero />

        <section className={styles.metricsGrid}>
          {ciberMetrics.map((metric) => (
            <CiberMetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        <section className={styles.contentGrid}>
          <CiberThreatFeed threats={ciberThreats} />
          <CiberAssetQueue assets={ciberAssets} />
        </section>

        <CiberControlsTable controls={ciberControls} />
      </div>
    </div>
  );
}

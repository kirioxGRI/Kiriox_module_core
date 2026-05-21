import type { AccessContext } from "@/shared/types";
import type { EnterpriseLaunchpadCard } from "@/modules/core/application/builders/buildEnterpriseLaunchpadCards";
import LaunchpadGrid from "@/modules/core/ui/components/launchpad/LaunchpadGrid";
import LaunchpadHero from "@/modules/core/ui/components/launchpad/LaunchpadHero";
import styles from "./EnterpriseLaunchpadPage.module.css";

type EnterpriseLaunchpadPageProps = {
  access: AccessContext;
  cards: EnterpriseLaunchpadCard[];
};

export default function EnterpriseLaunchpadPage({ access, cards }: EnterpriseLaunchpadPageProps) {
  return (
    <main className={styles.page}>
      <div className={styles.glowA} />
      <div className={styles.glowB} />
      <div className={styles.glowC} />

      <section className={styles.shell}>
        <LaunchpadHero access={access} />
        <LaunchpadGrid cards={cards} />
      </section>
    </main>
  );
}

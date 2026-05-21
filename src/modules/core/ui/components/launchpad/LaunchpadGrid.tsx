import type { EnterpriseLaunchpadCard } from "@/modules/core/application/builders/buildEnterpriseLaunchpadCards";
import LaunchpadCard from "./LaunchpadCard";
import styles from "./LaunchpadGrid.module.css";

type LaunchpadGridProps = {
  cards: EnterpriseLaunchpadCard[];
};

export default function LaunchpadGrid({ cards }: LaunchpadGridProps) {
  return (
    <section className={styles.grid}>
      {cards.map((card) => (
        <LaunchpadCard key={card.id} card={card} />
      ))}
    </section>
  );
}

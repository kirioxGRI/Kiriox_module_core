import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  FileText,
  FlaskConical,
  Layers3,
  LayoutGrid,
  Puzzle,
  ShieldAlert,
  TowerControl,
} from "lucide-react";
import type { EnterpriseLaunchpadCard } from "@/modules/core/application/builders/buildEnterpriseLaunchpadCards";
import styles from "./LaunchpadCard.module.css";

type LaunchpadCardProps = {
  card: EnterpriseLaunchpadCard;
};

const ICONS = {
  activity: Activity,
  alert: AlertTriangle,
  building: Building2,
  file: FileText,
  flask: FlaskConical,
  layers: Layers3,
  layout: LayoutGrid,
  puzzle: Puzzle,
  pulse: TowerControl,
  shield: ShieldAlert,
} as const;

export default function LaunchpadCard({ card }: LaunchpadCardProps) {
  const Icon = ICONS[card.iconKey as keyof typeof ICONS] ?? LayoutGrid;

  return (
    <Link href={card.href} className={`${styles.card} ${styles[`accent${capitalize(card.accent)}`]}`}>
      <div className={styles.iconWrap}>
        <Icon size={34} strokeWidth={1.8} />
      </div>

      <div className={styles.copy}>
        <h3 className={styles.title}>{card.title}</h3>
        <p className={styles.description}>{card.description}</p>
      </div>

      <div className={styles.arrowWrap}>
        <ArrowRight size={22} />
      </div>
    </Link>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

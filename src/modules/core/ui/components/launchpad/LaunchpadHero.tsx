import { ChevronDown, CircleUserRound } from "lucide-react";
import type { AccessContext } from "@/shared/types";
import styles from "./LaunchpadHero.module.css";

type LaunchpadHeroProps = {
  access: AccessContext;
};

export default function LaunchpadHero({ access }: LaunchpadHeroProps) {
  return (
    <header className={styles.hero}>
      <div className={styles.copy}>
        <p className={styles.kicker}>Bienvenido a</p>
        <h1 className={styles.title}>
          Kiriox <span>Enterprise.</span>
        </h1>
        <p className={styles.description}>
          Plataforma empresarial integrada para gestionar riesgos, cumplimiento y resiliencia organizacional.
        </p>
      </div>

      <div className={styles.account}>
        <div className={styles.accountIcon}>
          <CircleUserRound size={22} />
        </div>
        <div className={styles.accountCopy}>
          <span className={styles.accountEmail}>{access.user.email || access.user.name}</span>
          <span className={styles.accountCompany}>{access.company.name}</span>
        </div>
        <ChevronDown size={20} className={styles.accountChevron} />
      </div>
    </header>
  );
}

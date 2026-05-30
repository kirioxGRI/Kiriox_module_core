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

        <footer className={styles.footer}>
          <div className={styles.footerTop}>
            <span className={styles.logo}>Kiriox</span>
            <div className={styles.divider} />
          </div>
          <div className={styles.footerBottom}>
            <p className={styles.description}>
              Plataforma empresarial integrada para gestionar riesgos, cumplimiento y resiliencia organizacional.
            </p>
            <div className={styles.links}>
              <a href="https://kiriox.siviedeif.com/" target="_blank" rel="noopener noreferrer" className={styles.link}>
                Kiriox
              </a>
              <a href="https://kiriox.com/blog/blog/" target="_blank" rel="noopener noreferrer" className={styles.link}>
                Blog
              </a>
              <a href="https://manifiestogri.siviedeif.com/" target="_blank" rel="noopener noreferrer" className={styles.link}>
                Manifiesto
              </a>
              <a href="https://www.linkedin.com/in/kiriox/" target="_blank" rel="noopener noreferrer" className={styles.link}>
                Linkedin
              </a>
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}

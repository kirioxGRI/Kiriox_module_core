import Link from "next/link";
import {
  BarChart3,
  ArrowRight,
  Cpu,
  ShieldAlert,
  CheckSquare,
  RefreshCw,
} from "lucide-react";
import styles from "./AuditoriaDashboardPage.module.css";

type AuditoriaCard = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ size?: number }>;
};

const CARDS: AuditoriaCard[] = [
  {
    title: "Auditoría financiera",
    description:
      "Evalúe la integridad de estados financieros, controles contables y cumplimiento de normas de información financiera.",
    href: "/gestion/auditoria/financiera",
    icon: BarChart3,
  },
  {
    title: "Auditoría de tecnología",
    description:
      "Revise infraestructura, sistemas de información, controles de acceso y gobierno tecnológico de la organización.",
    href: "/gestion/auditoria/tecnologia",
    icon: Cpu,
  },
  {
    title: "Auditoría de ciberseguridad",
    description:
      "Identifique brechas de seguridad, evalúe controles defensivos y verifique el cumplimiento de marcos como ISO 27001 y NIST.",
    href: "/gestion/auditoria/ciberseguridad",
    icon: ShieldAlert,
  },
  {
    title: "Auditoría de calidad",
    description:
      "Verifique el cumplimiento de estándares de calidad, procesos certificados y mejora continua en la cadena operativa.",
    href: "/gestion/auditoria/calidad",
    icon: CheckSquare,
  },
  {
    title: "Auditoría continua",
    description:
      "Monitoree controles y transacciones en tiempo real mediante análisis automatizado, alertas tempranas y revisión permanente.",
    href: "/gestion/auditoria/continua",
    icon: RefreshCw,
  },
];

export default function AuditoriaDashboardPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Gobierno de Auditoría</p>
        <h1 className={styles.title}>
          Auditoría <span>interna.</span>
        </h1>
        <p className={styles.subtitle}>
          Seleccione el tipo de auditoría que desea ejecutar o supervisar.
        </p>
      </header>

      <section className={styles.grid}>
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className={styles.card}>
              <div className={styles.iconWrap}>
                <Icon size={24} />
              </div>
              <h3 className={styles.cardTitle}>{card.title}</h3>
              <p className={styles.cardDescription}>{card.description}</p>
              <div className={styles.cardFooter}>
                Abrir <ArrowRight size={14} />
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

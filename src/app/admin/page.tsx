import Link from "next/link";
import { Calendar, KeyRound, Shield, ArrowRight } from "lucide-react";
import { getServerAccessContext } from "@/core/permissions/server/getServerAccessContext";

export default async function AdminPage() {
  const access = await getServerAccessContext();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "transparent",
        padding: "3rem 2.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "2.5rem",
      }}
    >
      {/* Header */}
      <div>
        <p style={{ margin: "0 0 0.4rem", fontSize: "0.8rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Panel de administración
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: "2rem",
            fontWeight: 800,
            color: "#f1f5f9",
            lineHeight: 1.15,
          }}
        >
          Bienvenido{access?.user?.name ? `, ${access.user.name}` : ""}
        </h1>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem", color: "#64748b" }}>
          Gestiona la configuración interna del sistema.
        </p>
      </div>

      {/* Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "1.25rem",
          maxWidth: 900,
        }}
      >
        <AdminCard
          href="/admin/usuarios"
          icon={<Shield size={28} strokeWidth={1.6} />}
          accent="#6366f1"
          accentRgb="99,102,241"
          title="Gestión de seguridad"
          description="Administra usuarios, roles y permisos. Controla el acceso a módulos y recursos del sistema."
        />

        <AdminCard
          href="/admin/agenda"
          icon={<Calendar size={28} strokeWidth={1.6} />}
          accent="#10b981"
          accentRgb="16,185,129"
          title="Gestión de agenda"
          description="Organiza, consulta y programa eventos, reuniones y actividades del equipo."
        />

        <AdminCard
          href="/admin/accesos-sistema"
          icon={<KeyRound size={28} strokeWidth={1.6} />}
          accent="#f59e0b"
          accentRgb="245,158,11"
          title="Accesos: Roles por sistema"
          description="Configura qué permisos (A, R, W, X) tiene cada rol sobre cada sistema corporativo."
        />
      </div>
    </div>
  );
}

type AdminCardProps = {
  href: string;
  icon: React.ReactNode;
  accent: string;
  accentRgb: string;
  title: string;
  description: string;
};

function AdminCard({ href, icon, accent, accentRgb, title, description }: AdminCardProps) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        padding: "1.75rem",
        borderRadius: 18,
        background: `linear-gradient(145deg, rgba(${accentRgb},0.07) 0%, rgba(15,23,42,0.6) 100%)`,
        border: `1px solid rgba(${accentRgb},0.2)`,
        textDecoration: "none",
        transition: "all 0.2s ease",
        boxShadow: `0 4px 24px rgba(${accentRgb},0.08)`,
        cursor: "pointer",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: `rgba(${accentRgb},0.12)`,
          border: `1px solid rgba(${accentRgb},0.25)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accent,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <h2
          style={{
            margin: "0 0 0.5rem",
            fontSize: "1.2rem",
            fontWeight: 700,
            color: "#f1f5f9",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: "0.85rem",
            color: "#64748b",
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      </div>

      {/* CTA */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.5rem 1rem",
          borderRadius: 8,
          background: `rgba(${accentRgb},0.12)`,
          border: `1px solid rgba(${accentRgb},0.3)`,
          color: accent,
          fontSize: "0.82rem",
          fontWeight: 600,
          alignSelf: "flex-start",
        }}
      >
        Gestionar <ArrowRight size={14} />
      </div>
    </Link>
  );
}

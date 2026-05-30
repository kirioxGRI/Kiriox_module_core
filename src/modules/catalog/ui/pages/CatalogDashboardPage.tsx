"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FolderTree,
  Workflow,
  ListChecks,
  Building2,
  Gauge,
  Zap,
  ShieldAlert,
  Users,
  Lock,
  Calculator,
  ArrowRight,
  AlertTriangle,
  Clock,
  Shield,
  Activity,
  KeyRound,
} from "lucide-react";

const catalogoModules = [
  {
    title: "Empresas",
    description: "Consulte y administre empresas registradas en el modelo de gobernanza.",
    icon: Building2,
    href: "/gestion/dashboard_empresa",
    color: "#ef4444",
    rgb: "239,68,68",
  },
  {
    title: "Probabilidad",
    description: "Configure las escalas y niveles de probabilidad para la evaluación de riesgos.",
    icon: Gauge,
    href: "/modelo/gobernanza/catalogo/probabilidad",
    color: "#06b6d4",
    rgb: "6,182,212",
  },
  {
    title: "Impacto",
    description: "Defina las categorías y escalas de impacto aplicables al análisis de riesgo.",
    icon: Zap,
    href: "/modelo/gobernanza/catalogo/impacto",
    color: "#e879f9",
    rgb: "232,121,249",
  },
  {
    title: "Apetito de riesgo",
    description: "Establezca los umbrales de tolerancia y apetito de riesgo de la organización.",
    icon: ShieldAlert,
    href: "/modelo/gobernanza/catalogo/apetito",
    color: "#fb923c",
    rgb: "251,146,60",
  },
  {
    title: "Usuarios",
    description: "Consulte y administre el padrón de usuarios de seguridad. Asigne o revoque roles desde el perfil de cada usuario.",
    icon: Users,
    href: "/admin/usuarios",
    color: "#10b981",
    rgb: "16,185,129",
  },
  {
    title: "Roles",
    description: "Definición de permisos y perfiles de seguridad.",
    icon: Lock,
    href: "/admin/roles",
    color: "#a855f7",
    rgb: "168,85,247",
  },
  {
    title: "Permisos rol / módulo",
    description: "Asigne permisos A, R, W y X por módulo para cada rol de seguridad.",
    icon: KeyRound,
    href: "/modelo/gobernanza/catalogo/roles-permisos",
    color: "#f59e0b",
    rgb: "245,158,11",
  },
  {
    title: "Logging de accesos",
    description: "Active o pause la bitácora crítica de accesos y consulte eventos recientes.",
    icon: Shield,
    href: "/modelo/gobernanza/catalogo/logging-accesos",
    color: "#38bdf8",
    rgb: "56,189,248",
  },
  {
    title: "Parámetros del Motor",
    description: "Gestión de pesos Wi, constantes α/β/γ y gatillos no compensables.",
    icon: Calculator,
    href: "/modelo/parametros",
    color: "#db2777",
    rgb: "219,39,119",
    isInactive: true,
  },
  {
    title: "Nivel de criticidad",
    description: "Defina los niveles de criticidad aplicables a las actividades del modelo.",
    icon: AlertTriangle,
    href: "/modelo/gobernanza/catalogo/criticidad",
    color: "#fb923c",
    rgb: "251,146,60",
  },
  {
    title: "Frecuencia",
    description: "Configure las frecuencias de ejecución aplicables a las actividades del modelo.",
    icon: Clock,
    href: "/modelo/gobernanza/catalogo/frecuencia",
    color: "#06b6d4",
    rgb: "6,182,212",
  },
  {
    title: "Gestión de tipo de control",
    description: "Defina los tipos de control, su naturaleza y capacidades de mitigación y detección.",
    icon: Shield,
    href: "/modelo/gobernanza/catalogo/control-type",
    color: "#14b8a6",
    rgb: "20,184,166",
  },
  {
    title: "Actividad",
    description: "Defina las actividades claves vinculadas a procesos para el análisis de riesgo.",
    icon: Activity,
    href: "/gobierno/actividades-clave/nuevo",
    color: "#6366f1",
    rgb: "99,102,241",
  },
  {
    title: "Proceso",
    description: "Gestione y defina los procesos vinculados al modelo de gobernanza.",
    icon: Workflow,
    href: "/gobierno/proceso",
    color: "#3b82f6",
    rgb: "59,130,246",
  },
];

function CatalogCard({ mod }: { mod: typeof catalogoModules[number] }) {
  const [hovered, setHovered] = useState(false);
  const Icon = mod.icon;
  const isInactive = Boolean((mod as any).isInactive);
  const isHover = hovered && !isInactive;
  const content = (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isHover
          ? `linear-gradient(145deg, rgba(${mod.rgb},0.10) 0%, rgba(15,35,80,0.80) 100%)`
          : "rgba(0,0,0,0.18)",
        border: `1px solid rgba(${mod.rgb},${isHover ? "0.45" : "0.2"})`,
        borderRadius: "16px",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        height: "100%",
        cursor: isInactive ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
        boxShadow: isHover
          ? `0 8px 32px rgba(${mod.rgb},0.15)`
          : "0 2px 8px rgba(0,0,0,0.3)",
        opacity: isInactive ? 0.55 : 1,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "12px",
          background: `rgba(${mod.rgb},0.15)`,
          border: `1px solid rgba(${mod.rgb},0.3)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={24} color={mod.color} />
      </div>

      <div style={{ flex: 1 }}>
        <h3
          style={{
            margin: "0 0 0.5rem",
            fontSize: "1.1rem",
            fontWeight: 700,
            color: "#f1f5f9",
            lineHeight: 1.2,
          }}
        >
          {mod.title}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "0.82rem",
            color: "#64748b",
            lineHeight: 1.5,
          }}
        >
          {mod.description}
        </p>
      </div>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.45rem 1rem",
          borderRadius: "8px",
          background: `rgba(${mod.rgb},${isHover ? "0.25" : "0.12"})`,
          border: `1px solid rgba(${mod.rgb},0.35)`,
          color: mod.color,
          fontSize: "0.8rem",
          fontWeight: 600,
          alignSelf: "flex-start",
          transition: "background 0.2s",
        }}
      >
        {isInactive ? (
          "Inactiva"
        ) : (
          <>
            Gestionar <ArrowRight size={13} />
          </>
        )}
      </div>
    </div>
  );

  if (isInactive) {
    return <div style={{ textDecoration: "none" }}>{content}</div>;
  }

  return (
    <Link href={mod.href} style={{ textDecoration: "none" }}>
      {content}
    </Link>
  );
}

export function CatalogDashboardPage() {
  const sortedCatalogModules = [...catalogoModules].sort((a, b) =>
    a.title.localeCompare(b.title, "es", { sensitivity: "base" })
  );

  return (
    <div
      style={{
        minHeight: "100%",
        padding: "0",
        background: "transparent",
      }}
    >
      <div
        style={{
          background: "transparent",
          padding: "2.5rem 2.5rem 2rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -60,
            right: 80,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "rgba(59,130,246,0.06)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -40,
            right: 240,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "rgba(139,92,246,0.07)",
            filter: "blur(50px)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "2rem",
            position: "relative",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "0.75rem",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 20px rgba(59,130,246,0.35)",
                }}
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "2.2rem",
                  fontWeight: 800,
                  color: "#f1f5f9",
                  lineHeight: 1,
                }}
              >
                Catálogos de Gobernanza
              </h1>
            </div>
            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: "0.9rem",
                maxWidth: 560,
                lineHeight: 1.6,
              }}
            >
              Centro de administración de catálogos de gobernanza para mantener
              coherencia estructural, trazabilidad operativa y consistencia del
              modelo en toda la plataforma.
            </p>
          </div>

          <div style={{ flexShrink: 0, opacity: 0.7 }} aria-hidden="true">
            <svg width="130" height="100" viewBox="0 0 130 100" fill="none">
              <rect
                x="20"
                y="30"
                width="90"
                height="55"
                rx="6"
                fill="rgba(59,130,246,0.12)"
                stroke="rgba(59,130,246,0.3)"
                strokeWidth="1.5"
              />
              <rect
                x="35"
                y="10"
                width="60"
                height="30"
                rx="5"
                fill="rgba(139,92,246,0.15)"
                stroke="rgba(139,92,246,0.35)"
                strokeWidth="1.5"
              />
              <circle cx="65" cy="10" r="4" fill="#8b5cf6" opacity="0.8" />
              <line
                x1="65"
                y1="14"
                x2="65"
                y2="30"
                stroke="rgba(139,92,246,0.5)"
                strokeWidth="1.5"
              />
              <rect
                x="40"
                y="48"
                width="18"
                height="14"
                rx="3"
                fill="rgba(59,130,246,0.25)"
                stroke="rgba(59,130,246,0.4)"
                strokeWidth="1"
              />
              <rect
                x="66"
                y="48"
                width="18"
                height="14"
                rx="3"
                fill="rgba(16,185,129,0.2)"
                stroke="rgba(16,185,129,0.4)"
                strokeWidth="1"
              />
              <rect
                x="40"
                y="68"
                width="44"
                height="8"
                rx="2"
                fill="rgba(255,255,255,0.06)"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
              <circle
                cx="105"
                cy="20"
                r="12"
                fill="rgba(59,130,246,0.1)"
                stroke="rgba(59,130,246,0.25)"
                strokeWidth="1.5"
              />
              <circle cx="105" cy="20" r="5" fill="rgba(59,130,246,0.4)" />
              <line
                x1="95"
                y1="38"
                x2="90"
                y2="48"
                stroke="rgba(59,130,246,0.3)"
                strokeWidth="1"
              />
            </svg>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 2.5rem 3rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {sortedCatalogModules.map((mod) => (
            <CatalogCard key={mod.href} mod={mod} />
          ))}
        </div>
      </div>
    </div>
  );
}

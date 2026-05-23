"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, Archive, BarChart3, Bell, Binary, BookOpen, BriefcaseBusiness,
  Building2, CalendarRange, CalendarCheck2, CheckSquare, ChevronDown,
  ClipboardCheck, Clock3, Cpu, FileText, FlaskConical, GitBranch, History,
  Home, Layers, Map, LayoutDashboard, ListChecks, Network, Puzzle, Radar, Scale,
  Settings, Shield, ShieldAlert, ShieldPlus, ShieldX, SlidersHorizontal,
  Target, Trophy, UserRoundCheck, Users, Workflow,
} from "lucide-react";
import type { ResolvedNavigationItem } from "@/core/navigation";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  LayoutDashboard, ShieldAlert, BarChart3, Network, ClipboardCheck, Scale,
  SlidersHorizontal, GitBranch, Cpu, Bell, FlaskConical, Trophy, History,
  Archive, Clock3, BriefcaseBusiness, CalendarCheck2, Users, ListChecks,
  UserRoundCheck, CheckSquare, Activity, ShieldX, Binary, Building2, Target,
  Settings, Workflow, CalendarRange, ShieldPlus, Home, Puzzle, Radar, Layers, Map,
  FileText, BookOpen,
};

function resolveIcon(iconName?: string) {
  if (!iconName) return Shield;
  return ICON_MAP[iconName] ?? Shield;
}

function isActivePath(pathname: string, href?: string) {
  if (!href) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

type SidebarProps = {
  items: ResolvedNavigationItem[];
  loading?: boolean;
};

export default function Sidebar({ items, loading = false }: SidebarProps) {
  const pathname = usePathname();
  const [isHovering, setIsHovering] = useState(false);
  const collapsed = !isHovering;
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    const saved = sessionStorage.getItem("sidebar_expanded");
    return saved ? (JSON.parse(saved) as Record<string, boolean>) : {};
  });

  useEffect(() => {
    sessionStorage.setItem("sidebar_expanded", JSON.stringify(expandedSections));
  }, [expandedSections]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.order - b.order),
    [items]
  );

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isActiveItem = (item: ResolvedNavigationItem): boolean => {
    if (isActivePath(pathname, item.href)) return true;
    return Boolean(item.children?.some((child) => isActiveItem(child)));
  };

  const renderNavItems = (navItems: ResolvedNavigationItem[], depth = 0): React.ReactNode =>
    [...navItems]
      .sort((a, b) => a.order - b.order)
      .map((item) => {
        const Icon = resolveIcon(item.icon);
        const hasChildren = Boolean(item.children && item.children.length > 0);
        const sectionExpanded = expandedSections[item.key] ?? true;
        const active = isActiveItem(item);
        const leftPadding = `${0.75 + depth * 0.4}rem`;
        const iconColor = depth > 0 ? "#ffffff" : "var(--primary)";
        const disabledIconColor = depth > 0 ? "rgba(255,255,255,0.45)" : "var(--muted)";
        const dividerStyle =
          depth === 0 && hasChildren
            ? { borderBottom: "1px solid rgba(220,220,220,0.22)", paddingBottom: "0.35rem", marginBottom: "0.35rem" }
            : undefined;

        if (!hasChildren) {
          if (item.disabled) {
            return (
              <div key={item.key} style={dividerStyle}>
                <div
                  className="sidebar-link"
                  style={{
                    display: "flex", alignItems: "center", gap: "1rem",
                    padding: `0.65rem 0.75rem 0.65rem ${leftPadding}`,
                    borderRadius: "10px", color: "var(--muted)", textDecoration: "none",
                    fontSize: depth > 0 ? "0.82rem" : "0.85rem",
                    background: "transparent", opacity: 0.45, cursor: "not-allowed",
                  }}
                >
                  <Icon size={depth > 0 ? 16 : 18} color={disabledIconColor} />
                  {!collapsed && <span>{item.label}</span>}
                </div>
              </div>
            );
          }
          return (
            <div key={item.key} style={dividerStyle}>
              <Link
                href={item.href || "#"}
                className={`sidebar-link ${active ? "active" : ""}`}
                style={{
                  display: "flex", alignItems: "center", gap: "1rem",
                  padding: `0.65rem 0.75rem 0.65rem ${leftPadding}`,
                  borderRadius: "10px",
                  color: active ? "white" : "var(--foreground)",
                  textDecoration: "none", transition: "all 0.2s ease",
                  fontSize: depth > 0 ? "0.82rem" : "0.85rem",
                  background: active ? "var(--primary-glow)" : "transparent",
                }}
              >
                <Icon size={depth > 0 ? 16 : 18} color={iconColor} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            </div>
          );
        }

        return (
          <div key={item.key} style={{ marginBottom: "0.25rem", ...dividerStyle }}>
            {!collapsed ? (
              <button
                onClick={() => toggleSection(item.key)}
                style={{
                  width: "100%", border: "none",
                  background: active ? "rgba(255,255,255,0.06)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  fontSize: depth > 0 ? "0.78rem" : "0.8rem",
                  color: active ? "var(--primary)" : "var(--muted)",
                  padding: `0.65rem 0.75rem 0.65rem ${leftPadding}`,
                  cursor: "pointer", borderRadius: "8px",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.65rem", fontWeight: 600 }}>
                  <Icon size={depth > 0 ? 15 : 16} color={iconColor} />
                  {item.label}
                </span>
                <ChevronDown
                  size={14}
                  style={{
                    transform: sectionExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </button>
            ) : (
              <div style={{ padding: `0.65rem 0.75rem 0.65rem ${leftPadding}`, opacity: 0.3 }}>
                <Icon size={16} color={iconColor} />
              </div>
            )}
            <div style={{ display: collapsed || sectionExpanded ? "flex" : "none", flexDirection: "column", gap: "0.2rem" }}>
              {item.children ? renderNavItems(item.children, depth + 1) : null}
            </div>
          </div>
        );
      });

  return (
    <aside
      className="glass-card"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{
        width: collapsed ? "var(--sidebar-collapsed-width)" : "var(--sidebar-width)",
        height: "100vh", display: "flex", flexDirection: "column",
        padding: "1.25rem 0.75rem", borderRadius: "0", border: "none",
        borderRight: "1px solid rgba(255,255,255,0.12)",
        transition: "width var(--transition-speed) ease",
        margin: 0,
        background: "#1e3d7a",
        zIndex: 100,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 0.75rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {collapsed ? (
            <div
              style={{
                width: "56px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                overflow: "visible",
              }}
            >
              <Image
                src="/logo.svg"
                alt="Logo"
                width={56}
                height={16}
                style={{ objectFit: "contain", width: "56px", height: "16px" }}
              />
            </div>
          ) : (
            <Image src="/logo.svg" alt="Logo" width={180} height={44} style={{ objectFit: "contain", maxWidth: "180px", height: "auto" }} />
          )}
        </div>
      </div>

      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem", overflowY: "auto", overflowX: "hidden" }}>
        {loading && !collapsed && (
          <div style={{ color: "var(--muted)", fontSize: "0.8rem", padding: "0.75rem" }}>
            Cargando navegación...
          </div>
        )}
        {!loading && renderNavItems(sortedItems)}
      </nav>
    </aside>
  );
}

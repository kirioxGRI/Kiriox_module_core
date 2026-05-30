"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  KeyRound,
  X,
  ChevronDown,
  ChevronRight,
  Shield,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

interface Permission {
  code: string;
  module_code: string;
  name: string;
  description: string | null;
}

interface DataPayload {
  roles: Role[];
  permissions: Permission[];
  assignments: Record<string, string[]>;
}

export function CatalogRolesPermisosPage() {
  const [data, setData] = useState<DataPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/rbac/permissions");
      if (!res.ok) throw new Error("Error al cargar datos");
      const json: DataPayload = await res.json();
      setData(json);
      if (!selectedRoleId && json.roles.length > 0) {
        setSelectedRoleId(json.roles[0].id);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const permissionsByModule = useMemo(() => {
    if (!data) return {};
    const map: Record<string, Permission[]> = {};
    for (const p of data.permissions) {
      if (!map[p.module_code]) map[p.module_code] = [];
      map[p.module_code].push(p);
    }
    return map;
  }, [data]);

  const activePermissions = useMemo<Set<string>>(() => {
    if (!data || !selectedRoleId) return new Set();
    return new Set(data.assignments[selectedRoleId] ?? []);
  }, [data, selectedRoleId]);

  const selectedRole = useMemo(
    () => data?.roles.find((r) => r.id === selectedRoleId) ?? null,
    [data, selectedRoleId]
  );

  const togglePermission = async (permissionCode: string, currentlyEnabled: boolean) => {
    if (!selectedRoleId) return;
    const key = `${selectedRoleId}:${permissionCode}`;
    setToggling((prev) => new Set(prev).add(key));

    try {
      const res = await fetch("/api/admin/rbac/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: selectedRoleId,
          permissionCode,
          enabled: !currentlyEnabled,
        }),
      });
      if (!res.ok) throw new Error("Error al actualizar");

      setData((prev) => {
        if (!prev) return prev;
        const next = { ...prev, assignments: { ...prev.assignments } };
        const codes = [...(next.assignments[selectedRoleId] ?? [])];
        if (!currentlyEnabled) {
          if (!codes.includes(permissionCode)) codes.push(permissionCode);
        } else {
          const idx = codes.indexOf(permissionCode);
          if (idx !== -1) codes.splice(idx, 1);
        }
        next.assignments[selectedRoleId] = codes;
        return next;
      });

      setToast({ msg: !currentlyEnabled ? "Permiso asignado" : "Permiso revocado", ok: true });
      setTimeout(() => setToast(null), 2200);
    } catch {
      setToast({ msg: "Error al guardar", ok: false });
      setTimeout(() => setToast(null), 2500);
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const toggleModule = (moduleCode: string) => {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleCode)) next.delete(moduleCode);
      else next.add(moduleCode);
      return next;
    });
  };

  const modulePermissionCount = (moduleCode: string) => {
    const perms = permissionsByModule[moduleCode] ?? [];
    const active = perms.filter((p) => activePermissions.has(p.code)).length;
    return { active, total: perms.length };
  };

  return (
    <div style={{ minHeight: "100%", background: "transparent", padding: 0 }}>
      {/* Header */}
      <div style={{ padding: "2.5rem 2.5rem 1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "12px",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 20px rgba(245,158,11,0.35)",
                flexShrink: 0,
              }}
            >
              <KeyRound size={22} color="white" />
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "1.75rem",
                  fontWeight: 800,
                  background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  lineHeight: 1.1,
                }}
              >
                Roles / Permisos
              </h1>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Asigne y revoque permisos por módulo a cada rol del sistema
              </p>
            </div>
          </div>

          <Link
            href="/modelo/gobernanza/catalogo"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.6rem 1.2rem",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#94a3b8",
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            <X size={16} /> Cerrar
          </Link>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "0 2.5rem 3rem", display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
        {loading && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "5rem", color: "#64748b", gap: "0.75rem" }}>
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: "0.85rem" }}>Cargando matriz de permisos…</span>
          </div>
        )}

        {error && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1.25rem 1.5rem",
              borderRadius: "12px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#fca5a5",
              fontSize: "0.85rem",
            }}
          >
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Role selector panel */}
            <div
              style={{
                width: 260,
                flexShrink: 0,
                background: "rgba(0,0,0,0.18)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "14px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Shield size={15} color="#94a3b8" />
                  <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05rem" }}>
                    Roles activos
                  </span>
                </div>
              </div>

              <div style={{ padding: "0.5rem" }}>
                {data.roles.map((role) => {
                  const isSelected = role.id === selectedRoleId;
                  const { active, total } = modulePermissionCount("");
                  void active; void total;
                  const roleActive = (data.assignments[role.id] ?? []).length;
                  return (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRoleId(role.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "0.75rem 1rem",
                        borderRadius: "10px",
                        border: isSelected ? "1px solid rgba(245,158,11,0.4)" : "1px solid transparent",
                        background: isSelected ? "rgba(245,158,11,0.1)" : "transparent",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: "0.88rem", color: isSelected ? "#fbbf24" : "#e2e8f0", marginBottom: "0.2rem" }}>
                        {role.name}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#475569" }}>
                        {roleActive} permiso{roleActive !== 1 ? "s" : ""} activo{roleActive !== 1 ? "s" : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Permissions matrix */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {selectedRole && (
                <div
                  style={{
                    padding: "1rem 1.5rem",
                    borderRadius: "12px",
                    background: "rgba(245,158,11,0.07)",
                    border: "1px solid rgba(245,158,11,0.2)",
                    marginBottom: "1.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <KeyRound size={16} color="#f59e0b" />
                  <div>
                    <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fbbf24" }}>
                      {selectedRole.name}
                    </span>
                    {selectedRole.description && (
                      <span style={{ fontSize: "0.8rem", color: "#94a3b8", marginLeft: "0.75rem" }}>
                        {selectedRole.description}
                      </span>
                    )}
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: "0.78rem", color: "#64748b" }}>
                    {activePermissions.size} / {data.permissions.length} permisos
                  </div>
                </div>
              )}

              {Object.keys(permissionsByModule)
                .sort()
                .map((moduleCode) => {
                  const perms = permissionsByModule[moduleCode];
                  const { active, total } = modulePermissionCount(moduleCode);
                  const isCollapsed = collapsedModules.has(moduleCode);
                  const allActive = active === total;
                  const noneActive = active === 0;

                  return (
                    <div
                      key={moduleCode}
                      style={{
                        marginBottom: "0.75rem",
                        borderRadius: "12px",
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.07)",
                        background: "rgba(0,0,0,0.15)",
                      }}
                    >
                      {/* Module header */}
                      <button
                        onClick={() => toggleModule(moduleCode)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          padding: "0.9rem 1.25rem",
                          background: "rgba(255,255,255,0.02)",
                          border: "none",
                          borderBottom: isCollapsed ? "none" : "1px solid rgba(255,255,255,0.06)",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        {isCollapsed ? (
                          <ChevronRight size={15} color="#64748b" />
                        ) : (
                          <ChevronDown size={15} color="#64748b" />
                        )}
                        <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#cbd5e1", flex: 1 }}>
                          {moduleCode}
                        </span>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "0.2rem 0.6rem",
                            borderRadius: "20px",
                            background: allActive
                              ? "rgba(16,185,129,0.15)"
                              : noneActive
                              ? "rgba(100,116,139,0.15)"
                              : "rgba(245,158,11,0.12)",
                            color: allActive ? "#34d399" : noneActive ? "#64748b" : "#fbbf24",
                            border: `1px solid ${allActive ? "rgba(16,185,129,0.3)" : noneActive ? "rgba(100,116,139,0.2)" : "rgba(245,158,11,0.25)"}`,
                          }}
                        >
                          {active} / {total}
                        </span>
                      </button>

                      {/* Permissions list */}
                      {!isCollapsed && (
                        <div>
                          {perms.map((perm, idx) => {
                            const enabled = activePermissions.has(perm.code);
                            const key = `${selectedRoleId}:${perm.code}`;
                            const isToggling = toggling.has(key);
                            const isLast = idx === perms.length - 1;

                            return (
                              <div
                                key={perm.code}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "1rem",
                                  padding: "0.75rem 1.25rem",
                                  borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)",
                                  transition: "background 0.15s",
                                }}
                              >
                                {/* Toggle */}
                                <button
                                  onClick={() => togglePermission(perm.code, enabled)}
                                  disabled={isToggling}
                                  title={enabled ? "Revocar permiso" : "Asignar permiso"}
                                  style={{
                                    width: 38,
                                    height: 22,
                                    borderRadius: "11px",
                                    border: "none",
                                    cursor: isToggling ? "wait" : "pointer",
                                    background: enabled ? "#16a34a" : "rgba(100,116,139,0.3)",
                                    position: "relative",
                                    flexShrink: 0,
                                    transition: "background 0.2s",
                                    opacity: isToggling ? 0.6 : 1,
                                  }}
                                >
                                  <span
                                    style={{
                                      position: "absolute",
                                      top: 3,
                                      left: enabled ? 19 : 3,
                                      width: 16,
                                      height: 16,
                                      borderRadius: "50%",
                                      background: "white",
                                      transition: "left 0.2s",
                                      boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                                    }}
                                  />
                                </button>

                                {/* Text */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontSize: "0.85rem",
                                      fontWeight: 600,
                                      color: enabled ? "#f1f5f9" : "#64748b",
                                      marginBottom: perm.description ? "0.15rem" : 0,
                                    }}
                                  >
                                    {perm.name}
                                  </div>
                                  {perm.description && (
                                    <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                                      {perm.description}
                                    </div>
                                  )}
                                </div>

                                {/* Code badge */}
                                <code
                                  style={{
                                    fontSize: "0.68rem",
                                    color: "#475569",
                                    background: "rgba(255,255,255,0.04)",
                                    border: "1px solid rgba(255,255,255,0.06)",
                                    borderRadius: "6px",
                                    padding: "0.15rem 0.5rem",
                                    flexShrink: 0,
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {perm.code}
                                </code>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.75rem 1.25rem",
            borderRadius: "12px",
            background: toast.ok ? "rgba(22,163,74,0.92)" : "rgba(220,38,38,0.92)",
            border: `1px solid ${toast.ok ? "rgba(74,222,128,0.4)" : "rgba(252,165,165,0.4)"}`,
            color: "white",
            fontSize: "0.85rem",
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            animation: "slideIn 0.2s ease",
            backdropFilter: "blur(8px)",
          }}
        >
          <span style={{ fontSize: "1rem" }}>{toast.ok ? "✓" : "✕"}</span>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

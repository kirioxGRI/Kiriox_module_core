"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, KeyRound, Loader2, Shield, X } from "lucide-react";

interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

interface ModuleItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

interface PermissionItem {
  id: string;
  code: "A" | "R" | "W" | "X";
  name: string;
  description: string;
}

interface DataPayload {
  roles: Role[];
  modules: ModuleItem[];
  permissions: PermissionItem[];
  assignments: Record<string, string[]>;
}

const PERMISSION_LABELS: Record<PermissionItem["code"], string> = {
  A: "Acceso",
  R: "Lectura",
  W: "Escritura",
  X: "Ejecución",
};

function assignmentKey(roleId: string, moduleId: string) {
  return `${roleId}:${moduleId}`;
}

export function CatalogRolesPermisosPage() {
  const [data, setData] = useState<DataPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/rbac/permissions");
      if (!res.ok) throw new Error("Error al cargar la matriz de permisos.");
      const json: DataPayload = await res.json();
      setData(json);
      setSelectedRoleId((current) => current ?? json.roles[0]?.id ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedRole = useMemo(
    () => data?.roles.find((role) => role.id === selectedRoleId) ?? null,
    [data, selectedRoleId],
  );

  const activeAssignments = useMemo(() => {
    if (!data || !selectedRoleId) return {} as Record<string, Set<string>>;

    const map: Record<string, Set<string>> = {};
    for (const module of data.modules) {
      map[module.id] = new Set(data.assignments[assignmentKey(selectedRoleId, module.id)] ?? []);
    }
    return map;
  }, [data, selectedRoleId]);

  const totalActivePermissions = useMemo(
    () =>
      Object.values(activeAssignments).reduce((sum, codes) => sum + codes.size, 0),
    [activeAssignments],
  );

  const togglePermission = async (moduleId: string, permissionCode: PermissionItem["code"]) => {
    if (!selectedRoleId) return;

    const key = `${selectedRoleId}:${moduleId}:${permissionCode}`;
    setToggling((prev) => new Set(prev).add(key));

    const currentlyEnabled = activeAssignments[moduleId]?.has(permissionCode) ?? false;
    try {
      const res = await fetch("/api/admin/rbac/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: selectedRoleId,
          moduleId,
          permissionCode,
          enabled: !currentlyEnabled,
        }),
      });

      if (!res.ok) throw new Error("No se pudo actualizar la asignación.");

      setData((prev) => {
        if (!prev) return prev;
        const nextAssignments = { ...prev.assignments };
        const aKey = assignmentKey(selectedRoleId, moduleId);
        const nextCodes = new Set(nextAssignments[aKey] ?? []);
        if (currentlyEnabled) {
          nextCodes.delete(permissionCode);
        } else {
          nextCodes.add(permissionCode);
        }
        nextAssignments[aKey] = Array.from(nextCodes).sort();
        return { ...prev, assignments: nextAssignments };
      });

      setToast({
        msg: currentlyEnabled ? "Permiso revocado." : "Permiso asignado.",
        ok: true,
      });
    } catch (err: unknown) {
      setToast({
        msg: err instanceof Error ? err.message : "No se pudo guardar.",
        ok: false,
      });
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      window.setTimeout(() => setToast(null), 2200);
    }
  };

  return (
    <div style={{ minHeight: "100%", background: "transparent", padding: 0 }}>
      <div style={{ padding: "2.5rem 2.5rem 1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 20px rgba(245,158,11,0.35)",
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
                Permisos rol / módulo
              </h1>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Defina permisos independientes A, R, W y X por rol y módulo.
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
              borderRadius: 10,
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
              borderRadius: 12,
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
            <div
              style={{
                width: 280,
                flexShrink: 0,
                background: "rgba(0,0,0,0.18)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14,
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
                  const roleAssignmentCount = data.modules.reduce((sum, module) => {
                    return sum + (data.assignments[assignmentKey(role.id, module.id)]?.length ?? 0);
                  }, 0);

                  return (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRoleId(role.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "0.85rem 1rem",
                        borderRadius: 10,
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
                        {roleAssignmentCount} asignación{roleAssignmentCount !== 1 ? "es" : ""} activa{roleAssignmentCount !== 1 ? "s" : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {selectedRole && (
                <div
                  style={{
                    padding: "1rem 1.5rem",
                    borderRadius: 12,
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
                    {totalActivePermissions} permisos efectivos
                  </div>
                </div>
              )}

              <div
                style={{
                  overflow: "hidden",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(0,0,0,0.15)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(220px, 1.4fr) repeat(4, minmax(88px, 0.55fr))",
                    padding: "0.9rem 1.25rem",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.02)",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05rem" }}>
                    Módulo
                  </div>
                  {data.permissions.map((permission) => (
                    <div
                      key={permission.id}
                      style={{ fontSize: "0.72rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05rem", textAlign: "center" }}
                      title={permission.description}
                    >
                      {permission.code}
                    </div>
                  ))}
                </div>

                {data.modules.map((module, index) => {
                  const enabledSet = activeAssignments[module.id] ?? new Set<string>();
                  return (
                    <div
                      key={module.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(220px, 1.4fr) repeat(4, minmax(88px, 0.55fr))",
                        padding: "1rem 1.25rem",
                        gap: "0.75rem",
                        alignItems: "center",
                        borderBottom: index === data.modules.length - 1 ? "none" : "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#e2e8f0" }}>
                          {module.name}
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "0.2rem" }}>
                          {module.code}
                        </div>
                      </div>

                      {data.permissions.map((permission) => {
                        const isEnabled = enabledSet.has(permission.code);
                        const key = `${selectedRoleId}:${module.id}:${permission.code}`;
                        const isBusy = toggling.has(key);

                        return (
                          <button
                            key={permission.id}
                            type="button"
                            onClick={() => togglePermission(module.id, permission.code)}
                            disabled={!selectedRoleId || isBusy}
                            title={`${PERMISSION_LABELS[permission.code]}${isEnabled ? " asignado" : " no asignado"}`}
                            style={{
                              height: 42,
                              borderRadius: 12,
                              border: isEnabled
                                ? "1px solid rgba(16,185,129,0.45)"
                                : "1px solid rgba(255,255,255,0.08)",
                              background: isEnabled
                                ? "rgba(16,185,129,0.14)"
                                : "rgba(255,255,255,0.03)",
                              color: isEnabled ? "#d1fae5" : "#94a3b8",
                              fontWeight: 800,
                              cursor: isBusy ? "wait" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.35rem",
                              opacity: isBusy ? 0.7 : 1,
                            }}
                          >
                            {isBusy ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : permission.code}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

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
            borderRadius: 12,
            background: toast.ok ? "rgba(22,163,74,0.92)" : "rgba(220,38,38,0.92)",
            color: "white",
            fontSize: "0.85rem",
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          <span style={{ fontSize: "1rem" }}>{toast.ok ? "✓" : "✕"}</span>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

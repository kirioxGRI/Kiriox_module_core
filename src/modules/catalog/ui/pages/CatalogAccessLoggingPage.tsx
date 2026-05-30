"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertCircle, Loader2, Shield, X } from "lucide-react";

type AccessLog = {
  id: string;
  createdAt: string;
  actionCode: string;
  accessResult: string;
  resourceType: string;
  userEmail: string | null;
  moduleCode: string | null;
  submoduleCode: string | null;
  metadata: Record<string, unknown>;
};

type Payload = {
  logging: {
    enabled: boolean;
    updatedAt: string | null;
  };
  logs: AccessLog[];
};

export function CatalogAccessLoggingPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/access-logs?limit=80");
      if (!res.ok) throw new Error("No se pudo cargar el logging de accesos.");
      setData(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleLogging = async () => {
    if (!data) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/access-logs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !data.logging.enabled }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar el switch de logging.");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
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
                background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 20px rgba(14,165,233,0.35)",
              }}
            >
              <Activity size={22} color="white" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, color: "#e2e8f0", lineHeight: 1.1 }}>
                Logging de accesos
              </h1>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Auditoría crítica de acciones denegadas, errores y ejecuciones X.
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

      <div style={{ padding: "0 2.5rem 3rem", display: "grid", gap: "1.25rem" }}>
        {error && (
          <div
            style={{
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

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            padding: "1.4rem 1.5rem",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(0,0,0,0.18)",
          }}
        >
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05rem" }}>
              Switch global
            </div>
            <div style={{ marginTop: "0.45rem", fontSize: "1rem", fontWeight: 700, color: "#e2e8f0" }}>
              {loading ? "Cargando..." : data?.logging.enabled ? "Activo" : "Inactivo"}
            </div>
            <div style={{ marginTop: "0.35rem", fontSize: "0.8rem", color: "#64748b" }}>
              Cuando está activo, registra `denied`, `error` y `allowed` de acciones `X`.
            </div>
          </div>

          <button
            type="button"
            onClick={toggleLogging}
            disabled={loading || saving || !data}
            style={{
              minWidth: 168,
              height: 44,
              borderRadius: 12,
              border: data?.logging.enabled
                ? "1px solid rgba(239,68,68,0.35)"
                : "1px solid rgba(16,185,129,0.35)",
              background: data?.logging.enabled
                ? "rgba(239,68,68,0.12)"
                : "rgba(16,185,129,0.12)",
              color: data?.logging.enabled ? "#fecaca" : "#d1fae5",
              fontWeight: 800,
              cursor: loading || saving ? "wait" : "pointer",
            }}
          >
            {saving ? "Guardando..." : data?.logging.enabled ? "Desactivar logging" : "Activar logging"}
          </button>
        </div>

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
              gridTemplateColumns: "minmax(150px, 0.8fr) minmax(160px, 1fr) minmax(120px, 0.7fr) minmax(120px, 0.7fr) minmax(220px, 1.2fr)",
              padding: "0.9rem 1.25rem",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
              gap: "0.75rem",
            }}
          >
            {["Fecha", "Usuario", "Acción", "Recurso", "Módulo / razón"].map((header) => (
              <div key={header} style={{ fontSize: "0.72rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05rem" }}>
                {header}
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: "2rem", display: "flex", justifyContent: "center", color: "#64748b", gap: "0.75rem" }}>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
              Cargando eventos…
            </div>
          ) : !data || data.logs.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
              No hay eventos recientes para mostrar.
            </div>
          ) : (
            data.logs.map((log, index) => {
              const metadata = log.metadata ?? {};
              const decisionReason = typeof metadata.decision_reason === "string" ? metadata.decision_reason : "sin detalle";
              return (
                <div
                  key={log.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(150px, 0.8fr) minmax(160px, 1fr) minmax(120px, 0.7fr) minmax(120px, 0.7fr) minmax(220px, 1.2fr)",
                    padding: "1rem 1.25rem",
                    gap: "0.75rem",
                    alignItems: "start",
                    borderBottom: index === data.logs.length - 1 ? "none" : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#e2e8f0" }}>
                    {log.userEmail ?? "sin usuario"}
                  </div>
                  <div style={{ display: "flex", gap: "0.45rem", alignItems: "center" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.55rem",
                        borderRadius: 999,
                        background: "rgba(59,130,246,0.12)",
                        color: "#93c5fd",
                        fontSize: "0.74rem",
                        fontWeight: 800,
                      }}
                    >
                      {log.actionCode}
                    </span>
                    <span
                      style={{
                        padding: "0.2rem 0.55rem",
                        borderRadius: 999,
                        background:
                          log.accessResult === "allowed"
                            ? "rgba(16,185,129,0.12)"
                            : log.accessResult === "denied"
                            ? "rgba(239,68,68,0.12)"
                            : "rgba(245,158,11,0.12)",
                        color:
                          log.accessResult === "allowed"
                            ? "#86efac"
                            : log.accessResult === "denied"
                            ? "#fca5a5"
                            : "#fde68a",
                        fontSize: "0.74rem",
                        fontWeight: 800,
                      }}
                    >
                      {log.accessResult}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>{log.resourceType}</div>
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", display: "grid", gap: "0.2rem" }}>
                    <span>{log.moduleCode ?? "sin módulo"} / {log.submoduleCode ?? "sin submódulo"}</span>
                    <span>{decisionReason}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

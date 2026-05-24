'use client';

import React, { useEffect, useState } from 'react';
import { Filter, Globe, Search, Plus, Calendar, Tag, X, Trash2 } from 'lucide-react';
import { BuscarHechosPanel } from './BuscarHechosPanel';
import { PluginZone } from '@/core/plugin-engine/PluginZone';

type IncidentRow = {
  id: string;
  code: string;
  title: string;
  description: string;
  occurredAt: string;
  detectedAt: string;
  type: string;
  status: string;
  observedImpact: string;
  reportedBy: string;
  createdAt: string;
  elementId: string;
  elementCode: string | null;
  elementName: string | null;
};

const IMPACTO_COLOR: Record<string, string> = {
  Alto:  '#ef4444',
  Medio: '#f59e0b',
  Bajo:  '#10b981',
};

function Badge({ label, bg, text }: { label: string; bg: string; text: string }) {
  return (
    <span style={{ background: bg, color: text, padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

export function HechosRelevantesTab() {
  const [selected, setSelected] = useState<IncidentRow | null>(null);
  const [buscarOpen, setBuscarOpen] = useState(false);
  const [items, setItems] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadIncidents() {
    setLoading(true);
    try {
      const res = await fetch('/api/hechos-relevantes/incidents', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando incidentes');
      setItems(Array.isArray(data.items) ? data.items : []);
      setError(null);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : 'Error cargando incidentes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadIncidents();
  }, []);

  function inferImpact(status: string): string {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'en proceso') return 'Alto';
    if (normalized === 'corregido') return 'Medio';
    return 'Bajo';
  }

  function formatDate(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toISOString().slice(0, 10);
  }

  async function handleDelete(incident: IncidentRow) {
    const confirmed = window.confirm(
      `¿Está seguro de eliminar físicamente el incidente [${incident.code}] ${incident.title}? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    setDeletingId(incident.id);
    setError(null);

    try {
      const res = await fetch(`/api/hechos-relevantes/incidents?id=${incident.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error al eliminar incidente');
      if (selected?.id === incident.id) setSelected(null);
      setItems((prev) => prev.filter((item) => item.id !== incident.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar incidente');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '9px 14px', fontSize: '0.82rem', color: '#94a3b8', cursor: 'pointer' }}>
            <Filter size={14} /> Tipo
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '9px 14px', fontSize: '0.82rem', color: '#94a3b8', cursor: 'pointer' }}>
            <Globe size={14} /> Fuente
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setBuscarOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '9px 16px', fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8', cursor: 'pointer' }}>
            <Search size={14} /> Buscar incidentes
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#3b82f6', border: 'none', borderRadius: '10px', padding: '9px 16px', fontSize: '0.82rem', fontWeight: 800, color: '#fff', cursor: 'pointer' }}>
            <Plus size={14} /> Registrar incidente
          </button>
        </div>
      </div>

      {/* Cards */}
      <PluginZone pointId="incident:dashboard:widget" label="Extensiones activas del módulo" />

      {error && (
        <div style={{ color: '#fecaca', background: 'rgba(123, 31, 52, 0.3)', border: '1px solid rgba(248, 113, 113, 0.35)', borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem', marginBottom: '0.85rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {loading ? (
          <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '18px 20px', color: '#94a3b8' }}>
            Cargando incidentes...
          </div>
        ) : items.length === 0 ? (
          <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '18px 20px', color: '#94a3b8' }}>
            No hay incidentes registrados.
          </div>
        ) : items.map((hr) => {
          const impacto = inferImpact(hr.status);
          return (
          <div
            key={hr.id}
            onClick={() => setSelected(hr)}
            style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '18px 20px', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(59,130,246,0.35)';
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(15,23,42,0.9)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(15,23,42,0.7)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>{hr.code}</span>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#334155' }} />
                  <Badge label={hr.type} bg="rgba(59,130,246,0.1)" text="#60a5fa" />
                  <Badge label={`Impacto ${impacto}`} bg={`${IMPACTO_COLOR[impacto]}18`} text={IMPACTO_COLOR[impacto]} />
                  {hr.elementCode && <Badge label={hr.elementCode} bg="rgba(148,163,184,0.12)" text="#cbd5e1" />}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.35 }}>{hr.title}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 2 }}>
                  <Calendar size={11} style={{ display: 'inline', marginRight: 4 }} />{formatDate(hr.occurredAt)}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>{hr.status}</div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDelete(hr);
                  }}
                  disabled={deletingId === hr.id}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(248,113,113,0.24)', borderRadius: 8, padding: '6px 10px', color: '#fca5a5', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700, opacity: deletingId === hr.id ? 0.6 : 1 }}
                >
                  <Trash2 size={12} />
                  {deletingId === hr.id ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
            <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.55 }}>{hr.description}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.77rem', color: '#3b82f6', fontWeight: 700 }}>
              <Tag size={12} /> Proceso vinculado: {hr.elementName || 'Sin proceso'}
            </div>
          </div>
        );
        })}
      </div>

      {/* Drawer */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 480, maxWidth: '90vw', height: '100vh', background: '#0b1120', borderLeft: '1px solid rgba(255,255,255,0.08)', boxShadow: '-24px 0 48px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.25s ease-out' }}
          >
            <div style={{ padding: '1.75rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <Badge label={selected.type} bg="rgba(59,130,246,0.1)" text="#60a5fa" />
                  <Badge label={`Impacto ${inferImpact(selected.status)}`} bg={`${IMPACTO_COLOR[inferImpact(selected.status)]}18`} text={IMPACTO_COLOR[inferImpact(selected.status)]} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.3 }}>{selected.title}</h3>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                {[
                  { label: 'Código', value: selected.code },
                  { label: 'Fecha', value: formatDate(selected.occurredAt) },
                  { label: 'Tipo', value: selected.type },
                  { label: 'Estado', value: selected.status },
                  { label: 'Proceso', value: selected.elementName || 'Sin proceso' },
                  { label: 'Reportado por', value: selected.reportedBy },
                ].map((f) => (
                  <div key={f.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>{f.label}</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0' }}>{f.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>Descripción</div>
                <p style={{ margin: 0, fontSize: '0.87rem', color: '#cbd5e1', lineHeight: 1.65 }}>{selected.description}</p>
              </div>
              <div style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>Impacto observado</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 700, color: '#60a5fa' }}>
                  <Tag size={14} /> {selected.observedImpact}
                </div>
              </div>
            </div>
            <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => void handleDelete(selected)}
                disabled={deletingId === selected.id}
                style={{ flex: 1, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(248,113,113,0.24)', borderRadius: '10px', padding: '10px', fontSize: '0.82rem', fontWeight: 800, color: '#fca5a5', cursor: 'pointer', opacity: deletingId === selected.id ? 0.6 : 1 }}
              >
                {deletingId === selected.id ? 'Eliminando...' : 'Eliminar incidente'}
              </button>
              <button onClick={() => setSelected(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px', fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8', cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {buscarOpen && <BuscarHechosPanel onClose={() => setBuscarOpen(false)} />}

      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </>
  );
}

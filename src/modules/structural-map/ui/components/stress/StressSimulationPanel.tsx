'use client';

import { Zap, Crosshair, AlertTriangle, RotateCcw } from 'lucide-react';
import {
  STRESS_EVENT_TYPES,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_SCENARIO,
  type StressEventType,
} from '@/modules/structural-map/domain/types/StressSimTypes';
import type { StressConfig } from '@/modules/structural-map/ui/hooks/useStressSimulation';

type Props = {
  selectedNodeId: string | null;
  selectedNodeName: string | null;
  scopeCount: number;
  config: StressConfig;
  updateConfig: <K extends keyof StressConfig>(key: K, value: StressConfig[K]) => void;
  running: boolean;
  error: string | null;
  hasResult: boolean;
  onRun: () => void;
  onClear: () => void;
};

const cardStyle: React.CSSProperties = { background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '0.75rem' };
const titleStyle: React.CSSProperties = { color: '#94a3b8', fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' };
const labelStyle: React.CSSProperties = { display: 'block', color: '#64748b', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' };
const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#f1f5f9', fontSize: '0.78rem', padding: '0.42rem 0.6rem', outline: 'none', boxSizing: 'border-box' };

export function StressSimulationPanel({
  selectedNodeId, selectedNodeName, scopeCount, config, updateConfig,
  running, error, hasResult, onRun, onClear,
}: Props) {
  const canRun = !!selectedNodeId && scopeCount > 0 && !running;
  const scenario = EVENT_TYPE_SCENARIO[config.eventType];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Nodo origen */}
      <div style={cardStyle}>
        <p style={titleStyle}><Crosshair size={12} /> Nodo origen del shock</p>
        {selectedNodeId ? (
          <p style={{ margin: 0, color: '#a78bfa', fontSize: '0.8rem', fontWeight: 700 }}>{selectedNodeName ?? selectedNodeId}</p>
        ) : (
          <p style={{ margin: 0, color: '#fbbf24', fontSize: '0.72rem' }}>Selecciona un nodo en el canvas para originar la cascada.</p>
        )}
        <p style={{ margin: '0.35rem 0 0', color: '#475569', fontSize: '0.63rem' }}>Universo de simulación: {scopeCount} entidades visibles</p>
      </div>

      {/* Configuración del shock */}
      <div style={cardStyle}>
        <p style={titleStyle}><Zap size={12} /> Shock inicial</p>

        <div style={{ marginBottom: '0.6rem' }}>
          <label style={labelStyle}>Severidad — {config.severity}</label>
          <input
            type="range" min={0} max={100} step={1} value={config.severity}
            onChange={(e) => updateConfig('severity', Number(e.target.value))}
            style={{ width: '100%', accentColor: '#a78bfa' }}
          />
        </div>

        <div style={{ marginBottom: '0.6rem' }}>
          <label style={labelStyle}>Duración (horas)</label>
          <input
            type="number" min={1} value={config.durationHours}
            onChange={(e) => updateConfig('durationHours', Number(e.target.value))}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '0.6rem' }}>
          <label style={labelStyle}>Tipo de evento</label>
          <select value={config.eventType} onChange={(e) => updateConfig('eventType', e.target.value as StressEventType)} style={inputStyle}>
            {STRESS_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <p style={{ margin: '0.25rem 0 0 0.1rem', color: '#475569', fontSize: '0.6rem', fontFamily: 'monospace' }}>escenario: {scenario}</p>
        </div>

        <div style={{ marginBottom: '0.6rem' }}>
          <label style={labelStyle}>Descripción</label>
          <textarea
            value={config.description} rows={2}
            onChange={(e) => updateConfig('description', e.target.value)}
            placeholder="Ej. Proveedor cloud indisponible"
            style={{ ...inputStyle, resize: 'vertical', minHeight: 44 }}
          />
        </div>

        <button
          onClick={onRun} disabled={!canRun}
          style={{
            width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8,
            border: '1px solid #a78bfa55', background: canRun ? '#a78bfa1f' : 'rgba(255,255,255,0.03)',
            color: canRun ? '#c4b5fd' : '#64748b', fontSize: '0.78rem', fontWeight: 800,
            cursor: canRun ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          }}
        >
          {running
            ? <><span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #a78bfa55', borderTopColor: '#a78bfa', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Simulando…</>
            : <><Zap size={13} /> Ejecutar simulación</>}
        </button>

        {hasResult && (
          <button
            onClick={onClear}
            style={{ width: '100%', marginTop: '0.4rem', padding: '0.4rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            <RotateCcw size={12} /> Limpiar simulación
          </button>
        )}

        {error && (
          <div style={{ marginTop: '0.5rem', padding: '0.45rem 0.55rem', borderRadius: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '0.68rem', display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
            <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
          </div>
        )}
      </div>
    </div>
  );
}

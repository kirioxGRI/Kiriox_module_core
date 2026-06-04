'use client';

import { useCallback, useReducer, useState } from 'react';
import { CheckCircle2, AlertTriangle, Activity, Shield, Zap, GitBranch } from 'lucide-react';
import type { ElenaEngine, ElenaRunResult } from '@/modules/structural-map/domain/types/ElenaTypes';
import type { ValidationResult } from '@/modules/structural-map/domain/types/PortfolioTypes';

type Props = {
  rootEntityId: string;
  rootEntityName?: string;
  onValidate:      () => Promise<ValidationResult | null>;
  onResult:        (result: ElenaRunResult) => void;
  onGraphRefresh?: () => void;
};

type BtnStatus = 'idle' | 'loading' | 'success' | 'error';
type BtnState  = Record<string, BtnStatus>;
type Action    = { type: 'START' | 'DONE' | 'FAIL'; key: string };

function reducer(state: BtnState, action: Action): BtnState {
  if (action.type === 'START') return { ...state, [action.key]: 'loading' };
  if (action.type === 'DONE')  return { ...state, [action.key]: 'success' };
  if (action.type === 'FAIL')  return { ...state, [action.key]: 'error' };
  return state;
}

const ENGINES: { type: ElenaEngine; label: string; icon: React.ElementType; color: string; fn: string }[] = [
  { type: 'structural',  label: 'Análisis estructural',    icon: Activity,      color: '#6366f1', fn: 'fn_elena_systemic_structural_analysis' },
  { type: 'criticality', label: 'Análisis de criticidad',  icon: Zap,           color: '#f87171', fn: 'fn_elena_systemic_criticality_analysis' },
  { type: 'resilience',  label: 'Análisis de resiliencia', icon: Shield,        color: '#4ade80', fn: 'fn_elena_systemic_resilience_analysis' },
  { type: 'exposure',    label: 'Análisis de exposición',  icon: AlertTriangle, color: '#fb923c', fn: 'fn_elena_systemic_exposure_analysis' },
];

const SEV_COLORS: Record<string, string> = { critical: '#f87171', high: '#fb923c', medium: '#fbbf24', low: '#4ade80' };

async function callElena(rootEntityId: string, engine: ElenaEngine, scenario?: string): Promise<ElenaRunResult> {
  const res = await fetch('/api/structural-map/elena/run', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ rootEntityId, engine, scenario }),
  });
  const text = await res.text();
  if (!text) {
    return errResult(engine, `El endpoint no devolvió contenido (HTTP ${res.status})`);
  }
  let payload: ElenaRunResult;
  try {
    payload = JSON.parse(text) as ElenaRunResult;
  } catch {
    return errResult(engine, `Respuesta no es JSON válido: ${text.slice(0, 100)}`);
  }
  if (!res.ok) {
    return errResult(engine, (payload as { error?: string }).error ?? `Error HTTP ${res.status}`, payload.functionName);
  }
  return payload;
}

function errResult(engine: ElenaEngine, error: string, functionName?: string): ElenaRunResult {
  return { ok: false, engine, functionName: functionName ?? engine, runId: '', executedAt: new Date().toISOString(), summary: { analysisType: engine, totalEntities: 0 }, rows: [], error };
}

function EngineButton({ label, status, color, icon: Icon, disabled, onClick }: {
  label: string; status: BtnStatus; color: string;
  icon: React.ElementType; disabled: boolean; onClick: () => void;
}) {
  const busy = status === 'loading';
  const displayLabel = busy ? 'Ejecutando…' : status === 'success' ? 'Ver resultado →' : status === 'error' ? 'Error al ejecutar' : label;
  const effectiveColor = status === 'error' ? '#f87171' : color;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '0.52rem 0.75rem', borderRadius: 8,
      border: `1px solid ${effectiveColor}44`,
      background: status === 'success' ? `${effectiveColor}18` : status === 'error' ? 'rgba(239,68,68,0.08)' : `${effectiveColor}0d`,
      color: effectiveColor, fontSize: '0.75rem', fontWeight: 700,
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      opacity: disabled && !busy ? 0.45 : 1, marginBottom: '0.15rem', transition: 'background 0.15s',
    }}>
      {busy
        ? <span style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${color}40`, borderTopColor: color, display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
        : <Icon size={12} />
      }
      {displayLabel}
      {status === 'success' && <CheckCircle2 size={11} />}
      {status === 'error'   && <AlertTriangle size={11} />}
    </button>
  );
}

const cardStyle: React.CSSProperties = { background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '0.75rem' };
const titleStyle: React.CSSProperties = { color: '#94a3b8', fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' };
const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#f1f5f9', fontSize: '0.78rem', padding: '0.42rem 0.6rem', outline: 'none', boxSizing: 'border-box' };

export function AnalysisPanel({ rootEntityId, rootEntityName, onValidate, onResult, onGraphRefresh }: Props) {
  const [btnState, dispatch]        = useReducer(reducer, {} as BtnState);
  const [vResult, setVResult]       = useState<ValidationResult | null>(null);
  const [simScenario, setSimScenario] = useState<string>('FAILURE');

  const anyLoading = Object.values(btnState).some((s) => s === 'loading');

  const runEngine = useCallback(async (engine: ElenaEngine, scenario?: string) => {
    dispatch({ type: 'START', key: engine });
    const result = await callElena(rootEntityId, engine, scenario);
    dispatch({ type: result.ok ? 'DONE' : 'FAIL', key: engine });
    onResult(result);
    if (result.ok) onGraphRefresh?.();
  }, [rootEntityId, onResult, onGraphRefresh]);

  const handleValidate = useCallback(async () => {
    dispatch({ type: 'START', key: 'validate' });
    const r = await onValidate();
    setVResult(r);
    dispatch({ type: 'DONE', key: 'validate' });
  }, [onValidate]);

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Validación */}
      <div style={cardStyle}>
        <p style={titleStyle}><CheckCircle2 size={12} /> Validación del modelo</p>
        {rootEntityName && <p style={{ margin: '0 0 0.5rem', color: '#60a5fa', fontSize: '0.72rem', fontWeight: 600 }}>{rootEntityName}</p>}
        <EngineButton label="Validar modelo" status={btnState.validate ?? 'idle'} color="#6366f1" icon={CheckCircle2} disabled={anyLoading} onClick={() => void handleValidate()} />
        {vResult && (
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              {(['critical', 'high', 'medium', 'low'] as const).map((sev) =>
                vResult.stats[sev] > 0 ? (
                  <span key={sev} style={{ padding: '0.18rem 0.5rem', borderRadius: 999, background: `${SEV_COLORS[sev]}18`, border: `1px solid ${SEV_COLORS[sev]}44`, color: SEV_COLORS[sev], fontSize: '0.65rem', fontWeight: 800 }}>
                    {vResult.stats[sev]} {sev}
                  </span>
                ) : null
              )}
              {vResult.is_valid && <span style={{ color: '#4ade80', fontSize: '0.7rem', fontWeight: 700 }}>✓ Modelo válido</span>}
            </div>
            <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {vResult.issues.map((issue, i) => (
                <div key={i} style={{ padding: '0.35rem 0.45rem', borderRadius: 6, background: `${SEV_COLORS[issue.severity]}0d`, border: `1px solid ${SEV_COLORS[issue.severity]}33` }}>
                  <p style={{ margin: 0, color: SEV_COLORS[issue.severity], fontSize: '0.67rem', fontWeight: 700 }}>{issue.issue}</p>
                  {issue.entity_name && <p style={{ margin: '0.1rem 0 0', color: '#94a3b8', fontSize: '0.61rem' }}>{issue.entity_name}</p>}
                  <p style={{ margin: '0.1rem 0 0', color: '#64748b', fontSize: '0.61rem' }}>{issue.recommendation}</p>
                </div>
              ))}
              {vResult.issues.length === 0 && <p style={{ color: '#4ade80', fontSize: '0.72rem', textAlign: 'center' }}>Sin problemas detectados</p>}
            </div>
          </div>
        )}
      </div>

      {/* Motores de análisis */}
      <div style={cardStyle}>
        <p style={titleStyle}><Activity size={12} /> Motores de análisis Elena</p>
        {ENGINES.map(({ type, label, icon, color, fn }) => (
          <div key={type}>
            <EngineButton label={label} status={btnState[type] ?? 'idle'} color={color} icon={icon} disabled={anyLoading} onClick={() => void runEngine(type)} />
            <p style={{ margin: '0 0 0.55rem 0.2rem', color: '#2d3748', fontSize: '0.59rem', fontFamily: 'monospace' }}>{fn}</p>
          </div>
        ))}
      </div>

      {/* Simulación de cascada */}
      <div style={cardStyle}>
        <p style={titleStyle}><GitBranch size={12} /> Simulación de cascada</p>
        <div style={{ marginBottom: '0.5rem' }}>
          <label style={{ display: 'block', color: '#64748b', fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Escenario</label>
          <select value={simScenario} onChange={(e) => setSimScenario(e.target.value)} style={inputStyle}>
            <option value="FAILURE">FAILURE — Falla total</option>
            <option value="DEGRADATION">DEGRADATION — Degradación (×0.6)</option>
            <option value="COMPROMISE">COMPROMISE — Compromiso (×0.85)</option>
          </select>
        </div>
        <EngineButton label="Simular cascada" status={btnState.cascade ?? 'idle'} color="#a78bfa" icon={GitBranch} disabled={anyLoading} onClick={() => void runEngine('cascade', simScenario)} />
        <p style={{ margin: '0.1rem 0 0 0.2rem', color: '#2d3748', fontSize: '0.59rem', fontFamily: 'monospace' }}>fn_elena_systemic_cascade_simulation</p>
      </div>
    </div>
  );
}

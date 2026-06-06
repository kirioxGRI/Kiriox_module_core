'use client';

import { Activity, GitBranch, Gauge } from 'lucide-react';
import {
  NODE_STATE_COLORS,
  NODE_STATE_LABELS,
  type NodeState,
  type StructuralStressResponse,
} from '@/modules/structural-map/domain/types/StressSimTypes';

type Props = { result: StructuralStressResponse };

const cardStyle: React.CSSProperties = { background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '0.75rem' };
const titleStyle: React.CSSProperties = { color: '#94a3b8', fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' };

function stateColor(state: NodeState): string {
  return state === 'NORMAL' ? '#64748b' : NODE_STATE_COLORS[state];
}

function Kpi({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{ flex: '1 1 70px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '0.5rem 0.6rem' }}>
      <p style={{ margin: 0, color, fontSize: '1.25rem', fontWeight: 800, lineHeight: 1 }}>{value}</p>
      <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
    </div>
  );
}

function fragilityColor(score: number): string {
  if (score >= 75) return '#ef4444';
  if (score >= 50) return '#fb923c';
  if (score >= 25) return '#fbbf24';
  return '#4ade80';
}

export function StressImpactPanel({ result }: Props) {
  const fColor = fragilityColor(result.fragilityScore);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Fragility Score */}
      <div style={cardStyle}>
        <p style={titleStyle}><Gauge size={12} /> Fragility Score estructural</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, color: fColor, lineHeight: 1 }}>{result.fragilityScore}</div>
          <div style={{ flex: 1 }}>
            <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ width: `${result.fragilityScore}%`, height: '100%', background: fColor, transition: 'width 0.4s' }} />
            </div>
            <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.62rem' }}>
              {result.scenario} · severidad {result.severity} · {result.durationHours} h
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={cardStyle}>
        <p style={titleStyle}><Activity size={12} /> Impacto sistémico</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          <Kpi label="Impactados" value={result.impactedNodes} color="#f1f5f9" />
          <Kpi label="Críticos" value={result.criticalNodes} color="#ef4444" />
          <Kpi label="Cascadas" value={result.cascadePaths.length} color="#a78bfa" />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
          <Kpi label="Riesgos" value={result.affectedRisks.length} color="#f472b6" />
          <Kpi label="Procesos" value={result.affectedProcesses.length} color="#60a5fa" />
          <Kpi label="Servicios" value={result.affectedServices.length} color="#34d399" />
          <Kpi label="Controles" value={result.affectedControls.length} color="#fbbf24" />
          <Kpi label="Obligaciones" value={result.affectedObligations.length} color="#fb923c" />
        </div>
      </div>

      {/* Top cascada */}
      <div style={cardStyle}>
        <p style={titleStyle}><GitBranch size={12} /> Top nodos con mayor efecto cascada</p>
        {result.topCascadeNodes.length === 0 && <p style={{ color: '#64748b', fontSize: '0.72rem' }}>Sin propagación detectada.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {result.topCascadeNodes.map((n, i) => (
            <div key={n.entityId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.45rem', borderRadius: 6, background: 'rgba(0,0,0,0.2)' }}>
              <span style={{ color: '#475569', fontSize: '0.66rem', fontWeight: 800, width: 16 }}>{i + 1}</span>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: stateColor(n.nodeState), flexShrink: 0 }} />
              <span style={{ flex: 1, color: '#e2e8f0', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.entityName ?? n.entityId}</span>
              <span style={{ color: '#94a3b8', fontSize: '0.62rem' }}>↓{n.dependents}</span>
              <span style={{ color: stateColor(n.nodeState), fontSize: '0.68rem', fontWeight: 800 }}>{Math.round(n.impactScore)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rutas de propagación */}
      <div style={cardStyle}>
        <p style={titleStyle}><GitBranch size={12} /> Rutas principales de propagación</p>
        {result.cascadePaths.length === 0 && <p style={{ color: '#64748b', fontSize: '0.72rem' }}>Sin rutas.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: 200, overflowY: 'auto' }}>
          {result.cascadePaths.slice(0, 15).map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.65rem', color: '#94a3b8' }}>
              <span style={{ color: '#475569' }}>d{p.depthLevel}</span>
              <span style={{ flex: 1, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.relationCode ? `${p.relationCode} → ` : '→ '}{p.targetEntityName ?? p.targetEntityId}
              </span>
              <span style={{ color: '#a78bfa', fontWeight: 700 }}>{Math.round(p.propagationScore * 100)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Leyenda de estados */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0 0.25rem' }}>
        {(['FAILED', 'CRITICAL', 'DEGRADED', 'VULNERABLE', 'NORMAL'] as NodeState[]).map((s) => (
          <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#94a3b8', fontSize: '0.6rem' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: stateColor(s) }} /> {NODE_STATE_LABELS[s]}
          </span>
        ))}
      </div>
    </div>
  );
}

'use client';

import { ShieldCheck, Link2, AlertOctagon } from 'lucide-react';
import type {
  StressRecommendation,
  StressRecommendationKind,
  StructuralStressResponse,
} from '@/modules/structural-map/domain/types/StressSimTypes';

type Props = { result: StructuralStressResponse };

const cardStyle: React.CSSProperties = { background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '0.75rem' };
const titleStyle: React.CSSProperties = { color: '#94a3b8', fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' };

const GROUPS: { kind: StressRecommendationKind; label: string; icon: React.ElementType; color: string }[] = [
  { kind: 'MITIGATION',          label: 'Mitigaciones de mayor impacto', icon: ShieldCheck,  color: '#4ade80' },
  { kind: 'CRITICAL_DEPENDENCY', label: 'Dependencias críticas',         icon: Link2,        color: '#fbbf24' },
  { kind: 'SPOF',                label: 'Puntos únicos de falla',        icon: AlertOctagon, color: '#ef4444' },
];

function Group({ kind, label, icon: Icon, color, recs }: { kind: StressRecommendationKind; label: string; icon: React.ElementType; color: string; recs: StressRecommendation[] }) {
  const items = recs.filter((r) => r.kind === kind);
  return (
    <div style={cardStyle}>
      <p style={{ ...titleStyle, color }}><Icon size={12} /> {label}</p>
      {items.length === 0 && <p style={{ color: '#64748b', fontSize: '0.7rem', margin: 0 }}>Sin elementos detectados.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {items.map((r) => (
          <div key={`${r.kind}-${r.entityId}`} style={{ padding: '0.4rem 0.5rem', borderRadius: 7, background: `${color}0d`, border: `1px solid ${color}33` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem' }}>
              <span style={{ color: '#e2e8f0', fontSize: '0.72rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.entityName ?? r.entityId}</span>
              <span style={{ color, fontSize: '0.68rem', fontWeight: 800, flexShrink: 0 }}>{Math.round(r.score)}</span>
            </div>
            <p style={{ margin: '0.2rem 0 0', color: '#94a3b8', fontSize: '0.62rem' }}>{r.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StressRecommendationsPanel({ result }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {GROUPS.map((g) => (
        <Group key={g.kind} {...g} recs={result.recommendations} />
      ))}
    </div>
  );
}

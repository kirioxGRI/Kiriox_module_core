import type { ElenaMetricRow } from '@/modules/structural-map/domain/types/ElenaTypes';
import { runKirioxAi } from '@/shared/ai';

export type ResilienceInsight = {
  /** Filas priorizadas: brechas/SPOF primero, más frágil arriba. */
  fragileRows: ElenaMetricRow[];
  mostFragileName: string;
  mostFragileResilience: number | null;
  mostFragileFragility: number | null;
  mostFragileLevel: string | null;
  mostFragileAltSupport: number | null;
  mostFragileIsSpof: boolean;
  spofNodes: string[];
  resilienceGapCount: number;
  avgResilience: number | null;
  strongestName: string;
  strongestResilience: number | null;
  nodesWithoutAlternative: string[];
};

function nameOf(row: ElenaMetricRow): string {
  return row.entity_name ?? row.entity_code;
}

export function deriveResilienceInsight(rows: ElenaMetricRow[]): ResilienceInsight {
  const withScore = rows.filter((row) => row.resilience_score != null);
  const byResilienceAsc = [...withScore].sort((a, b) => (a.resilience_score ?? 0) - (b.resilience_score ?? 0));
  const byResilienceDesc = [...withScore].sort((a, b) => (b.resilience_score ?? 0) - (a.resilience_score ?? 0));

  const flagged = byResilienceAsc.filter((row) => row.has_resilience_gap || row.is_spof);
  const fragileRows = flagged.length ? flagged : byResilienceAsc;

  const mostFragile = byResilienceAsc[0];
  const strongest = byResilienceDesc[0];

  const spofNodes = rows.filter((row) => row.is_spof).map(nameOf);
  const resilienceGapCount = rows.filter((row) => row.has_resilience_gap).length;

  const scores = withScore.map((row) => row.resilience_score as number);
  const avgResilience = scores.length
    ? parseFloat((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(2))
    : null;

  const nodesWithoutAlternative = rows
    .filter((row) => (row.dependent_count ?? 0) > 0 && (row.alternative_support_count ?? 0) === 0)
    .map(nameOf);

  return {
    fragileRows,
    mostFragileName: mostFragile ? nameOf(mostFragile) : '—',
    mostFragileResilience: mostFragile?.resilience_score ?? null,
    mostFragileFragility: mostFragile?.fragility_score ?? null,
    mostFragileLevel: mostFragile?.resilience_level ?? null,
    mostFragileAltSupport: mostFragile?.alternative_support_count ?? null,
    mostFragileIsSpof: Boolean(mostFragile?.is_spof),
    spofNodes,
    resilienceGapCount,
    avgResilience,
    strongestName: strongest ? nameOf(strongest) : '—',
    strongestResilience: strongest?.resilience_score ?? null,
    nodesWithoutAlternative,
  };
}

export async function runResilienceRecommendationAi(insight: ResilienceInsight): Promise<string> {
  const fmt = (value: number | null) => (value == null ? '—' : value.toFixed(2));
  const input = [
    `Nodo más frágil: ${insight.mostFragileName}.`,
    insight.mostFragileResilience != null ? `Resiliencia: ${fmt(insight.mostFragileResilience)}.` : '',
    insight.mostFragileFragility != null ? `Fragilidad: ${fmt(insight.mostFragileFragility)}.` : '',
    insight.mostFragileLevel ? `Nivel: ${insight.mostFragileLevel}.` : '',
    insight.mostFragileIsSpof ? 'Es punto único de falla (SPOF).' : '',
    insight.mostFragileAltSupport != null ? `Soportes alternativos: ${insight.mostFragileAltSupport}.` : '',
    `SPOF detectados: ${insight.spofNodes.length}.`,
    insight.spofNodes.length ? `Nodos SPOF: ${insight.spofNodes.slice(0, 5).join(', ')}.` : '',
    `Brechas de resiliencia: ${insight.resilienceGapCount}.`,
    insight.avgResilience != null ? `Resiliencia promedio del subgrafo: ${fmt(insight.avgResilience)}.` : '',
    insight.nodesWithoutAlternative.length
      ? `Nodos sin soporte alternativo: ${insight.nodesWithoutAlternative.slice(0, 5).join(', ')}.`
      : '',
    'Genera una recomendación ejecutiva única para aumentar la resiliencia del subgrafo, priorizando redundancia o respaldo en el punto más frágil.',
  ].filter(Boolean).join(' ');

  const result = await runKirioxAi({
    module: 'structural-risk',
    field: 'resilience_recommendation',
    intent: 'complete',
    tone: 'ejecutivo',
    output: 'text',
    minWords: 20,
    maxWords: 60,
    requiredMeaning: ['resiliencia estructural', 'redundancia o respaldo', 'acción prioritaria'],
    input,
  });

  return result.value;
}

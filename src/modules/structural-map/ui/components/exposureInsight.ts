import type { ElenaMetricRow } from '@/modules/structural-map/domain/types/ElenaTypes';
import { runKirioxAi } from '@/shared/ai';

export type ExposureInsight = {
  /** Filas priorizadas: brechas/alta exposición primero, más expuesta arriba. */
  exposedRows: ElenaMetricRow[];
  mostExposedName: string;
  mostExposedScore: number | null;
  mostExposedLevel: string | null;
  mostExposedUncontrolled: number | null;
  mostExposedRisks: number | null;
  exposureGapCount: number;
  totalUncontrolledRisks: number;
  avgExposure: number | null;
  nodesWithUncontrolled: string[];
  leastExposedName: string;
  leastExposedScore: number | null;
};

function nameOf(row: ElenaMetricRow): string {
  return row.entity_name ?? row.entity_code;
}

function isHighExposure(row: ElenaMetricRow): boolean {
  const level = (row.exposure_level ?? '').toUpperCase();
  return Boolean(row.has_exposure_gap) || level === 'CRITICAL' || level === 'HIGH';
}

export function deriveExposureInsight(rows: ElenaMetricRow[]): ExposureInsight {
  const withScore = rows.filter((row) => row.exposure_score != null);
  const byExposureDesc = [...withScore].sort((a, b) => (b.exposure_score ?? 0) - (a.exposure_score ?? 0));
  const byExposureAsc = [...withScore].sort((a, b) => (a.exposure_score ?? 0) - (b.exposure_score ?? 0));

  const flagged = byExposureDesc.filter(isHighExposure);
  const exposedRows = flagged.length ? flagged : byExposureDesc;

  const mostExposed = byExposureDesc[0];
  const leastExposed = byExposureAsc[0];

  const exposureGapCount = rows.filter((row) => row.has_exposure_gap).length;
  const totalUncontrolledRisks = rows.reduce((sum, row) => sum + (row.uncontrolled_risk_count ?? 0), 0);

  const scores = withScore.map((row) => row.exposure_score as number);
  const avgExposure = scores.length
    ? parseFloat((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(2))
    : null;

  const nodesWithUncontrolled = rows
    .filter((row) => (row.uncontrolled_risk_count ?? 0) > 0)
    .map(nameOf);

  return {
    exposedRows,
    mostExposedName: mostExposed ? nameOf(mostExposed) : '—',
    mostExposedScore: mostExposed?.exposure_score ?? null,
    mostExposedLevel: mostExposed?.exposure_level ?? null,
    mostExposedUncontrolled: mostExposed?.uncontrolled_risk_count ?? null,
    mostExposedRisks: mostExposed?.risk_count ?? null,
    exposureGapCount,
    totalUncontrolledRisks,
    avgExposure,
    nodesWithUncontrolled,
    leastExposedName: leastExposed ? nameOf(leastExposed) : '—',
    leastExposedScore: leastExposed?.exposure_score ?? null,
  };
}

export async function runExposureRecommendationAi(insight: ExposureInsight): Promise<string> {
  const fmt = (value: number | null) => (value == null ? '—' : value.toFixed(2));
  const input = [
    `Nodo más expuesto: ${insight.mostExposedName}.`,
    insight.mostExposedScore != null ? `Exposición: ${fmt(insight.mostExposedScore)}.` : '',
    insight.mostExposedLevel ? `Nivel: ${insight.mostExposedLevel}.` : '',
    insight.mostExposedRisks != null ? `Riesgos alcanzables: ${insight.mostExposedRisks}.` : '',
    insight.mostExposedUncontrolled != null ? `Riesgos sin control: ${insight.mostExposedUncontrolled}.` : '',
    `Brechas de exposición en el subgrafo: ${insight.exposureGapCount}.`,
    `Riesgos sin control totales: ${insight.totalUncontrolledRisks}.`,
    insight.avgExposure != null ? `Exposición promedio del subgrafo: ${fmt(insight.avgExposure)}.` : '',
    insight.nodesWithUncontrolled.length
      ? `Nodos con riesgos sin control: ${insight.nodesWithUncontrolled.slice(0, 5).join(', ')}.`
      : '',
    'Genera una recomendación ejecutiva única para reducir la exposición del subgrafo, priorizando cerrar la brecha de control en el nodo más expuesto.',
  ].filter(Boolean).join(' ');

  const result = await runKirioxAi({
    module: 'structural-risk',
    field: 'exposure_recommendation',
    intent: 'complete',
    tone: 'ejecutivo',
    output: 'text',
    minWords: 20,
    maxWords: 60,
    requiredMeaning: ['exposición estructural', 'control mitigante', 'acción prioritaria'],
    input,
  });

  return result.value;
}

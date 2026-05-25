'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Flame, Loader2, X } from 'lucide-react';
import styles from './StepAnalisisControlHeatMap.module.css';

type ValuationRisk = {
  id: string;
  code: string;
  risk: string;
  cause: string;
  event: string;
  consequence: string;
  id_valoration: string | null;
  activity: string;
  owner: string;
  owner_id: string | null;
  impact_score: number | null;
  probability_score: number | null;
  residual_impact_pos: number | null;
  residual_probability_pos: number | null;
  inherent_score: number;
  residual_score: number;
  reduction_score: number;
  reduction_percent: number;
  inherent_level: string | null;
  inherent_level_color: string | null;
  residual_level: string | null;
  residual_level_color: string | null;
  controls: Array<{ id: string; name: string }>;
};

type ValuationData = {
  meta: {
    run_ra_code: string;
    evaluated_process: string;
    risk_appetite: string;
    appetite_tolerance_min?: number | null;
    appetite_tolerance_max?: number | null;
  };
  summary: {
    total_inherent: number;
    total_residual: number;
    total_reduction: number;
    total_reduction_percent: number;
  };
  risks: ValuationRisk[];
  catalogs?: {
    valoration?: Array<{ id: string; label: string }>;
    owners?: Array<{ id: string; name: string }>;
    risk_levels?: Array<{ code: string; name: string; min_score: number; max_score: number; color: string }>;
  };
};

type HeatMapMode = 'inherent' | 'residual';

const probabilityAxis = ['1 Muy Baja', '2 Baja', '3 Media', '4 Alta', '5 Muy Alta'];
const impactAxis = ['1 Muy Bajo', '2 Bajo', '3 Medio', '4 Alto', '5 Muy Alto'];

const FALLBACK_LEVELS = [
  { code: 'VERY_LOW', name: 'Muy bajo', min_score: 1, max_score: 5, color: '#15c65b' },
  { code: 'LOW', name: 'Bajo', min_score: 6, max_score: 10, color: '#8ccb18' },
  { code: 'MEDIUM', name: 'Medio', min_score: 11, max_score: 15, color: '#f4cc00' },
  { code: 'HIGH', name: 'Alto', min_score: 16, max_score: 20, color: '#ff8f1f' },
  { code: 'CRITICAL', name: 'Crítico', min_score: 21, max_score: 25, color: '#ff463c' },
];

function clampLevel(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  if (value <= 1) return 1;
  if (value >= 5) return 5;
  const rounded = Math.round(value);
  return rounded >= 1 && rounded <= 5 ? rounded : null;
}

function clampAxis(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  if (value <= 1) return 1;
  if (value >= 5) return 5;
  return value;
}

function clampScatterCoord(value: number) {
  return Math.max(1.06, Math.min(4.94, value));
}

function computeJitteredCoords(impact: number, probability: number, indexInCell: number): [number, number] {
  if (indexInCell === 0) {
    return [clampScatterCoord(impact), clampScatterCoord(probability)];
  }

  const ringIndex = indexInCell - 1;
  const angle = (ringIndex % 8) * (Math.PI / 4);
  const ring = 1 + Math.floor(ringIndex / 8);
  const radius = 0.22 + (ring - 1) * 0.12;

  return [
    clampScatterCoord(impact + Math.cos(angle) * radius),
    clampScatterCoord(probability + Math.sin(angle) * radius),
  ];
}

function scoreToAxis(score: number | null | undefined): number | null {
  if (score == null || Number.isNaN(score)) return null;
  if (score <= 0) return 1;
  const normalized = 1 + ((Math.min(25, score) - 1) / 24) * 4;
  return clampAxis(normalized);
}

function resolveCoords(risk: ValuationRisk, mode: HeatMapMode) {
  const inherentProbability = clampAxis(risk.probability_score);
  const inherentImpact = clampAxis(risk.impact_score);
  const residualProbability = clampAxis(risk.residual_probability_pos);
  const residualImpact = clampAxis(risk.residual_impact_pos);

  if (mode === 'inherent') {
    if (inherentProbability != null && inherentImpact != null) {
      return { probability: inherentProbability, impact: inherentImpact };
    }
    const fallbackAxis = scoreToAxis(risk.inherent_score);
    return { probability: fallbackAxis, impact: fallbackAxis };
  }

  if (residualProbability != null && residualImpact != null) {
    return { probability: residualProbability, impact: residualImpact };
  }

  if (
    inherentProbability != null &&
    inherentImpact != null &&
    risk.inherent_score > 0 &&
    risk.residual_score >= 0
  ) {
    const ratio = Math.max(0, Math.min(1, risk.residual_score / risk.inherent_score));
    const shrink = Math.sqrt(ratio);
    return {
      probability: clampAxis(inherentProbability * shrink),
      impact: clampAxis(inherentImpact * shrink),
    };
  }

  const fallbackAxis = scoreToAxis(risk.residual_score || risk.inherent_score);
  return { probability: fallbackAxis, impact: fallbackAxis };
}

function getRiskColor(risk: ValuationRisk, mode: HeatMapMode) {
  return mode === 'inherent'
    ? risk.inherent_level_color || '#ffffff'
    : risk.residual_level_color || '#ffffff';
}

function getRiskLevelLabel(risk: ValuationRisk, mode: HeatMapMode) {
  return mode === 'inherent' ? risk.inherent_level || 'Sin nivel' : risk.residual_level || 'Sin nivel';
}

function getRiskScore(risk: ValuationRisk, mode: HeatMapMode) {
  return mode === 'inherent' ? risk.inherent_score : risk.residual_score;
}

function heatMapRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawHeatMapToCanvas(
  canvas: HTMLCanvasElement,
  risks: ValuationRisk[],
  levels: Array<{ code: string; name: string; min_score: number; max_score: number; color: string }>,
  mode: HeatMapMode,
  evalCode: string,
) {
  const width = 1460;
  const height = 690;
  const padLeft = 110;
  const padRight = 32;
  const padTop = 28;
  const padBottom = 78;
  const gridX = padLeft;
  const gridY = padTop;
  const gridW = width - padLeft - padRight;
  const gridH = height - padTop - padBottom;
  const cellW = gridW / 4;
  const cellH = gridH / 4;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#020817';
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createRadialGradient(width * 0.92, gridY - 10, 60, width * 0.92, gridY - 10, width * 0.92);
  gradient.addColorStop(0, '#ff463c');
  gradient.addColorStop(0.24, '#ff7b1d');
  gradient.addColorStop(0.5, '#c3ac00');
  gradient.addColorStop(0.72, '#f4cc00');
  gradient.addColorStop(1, '#12b552');
  ctx.fillStyle = gradient;
  ctx.fillRect(gridX, gridY, gridW, gridH);

  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const x = gridX + i * cellW;
    const y = gridY + i * cellH;
    ctx.beginPath();
    ctx.moveTo(x, gridY);
    ctx.lineTo(x, gridY + gridH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gridX, y);
    ctx.lineTo(gridX + gridW, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#e5e7eb';
  ctx.font = '600 12px system-ui,sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < impactAxis.length; i++) {
    ctx.fillText(impactAxis[i], gridX + i * cellW, gridY + gridH + 18);
  }

  ctx.textAlign = 'right';
  for (let i = 0; i < probabilityAxis.length; i++) {
    const y = gridY + gridH - i * cellH;
    ctx.fillText(probabilityAxis[i], gridX - 10, y + 4);
  }

  ctx.save();
  ctx.translate(28, gridY + gridH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#93a7c2';
  ctx.font = '700 13px system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Probabilidad', 0, 0);
  ctx.restore();

  ctx.fillStyle = '#93a7c2';
  ctx.font = '700 13px system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Impacto', gridX + gridW / 2, height - 20);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#e5e7eb';
  ctx.font = '700 20px system-ui,sans-serif';
  ctx.fillText(`Mapa de calor — ${mode === 'inherent' ? 'Riesgo inherente' : 'Riesgo residual'}`, gridX, 22);
  ctx.fillStyle = '#93a7c2';
  ctx.font = '500 12px system-ui,sans-serif';
  ctx.fillText(`Evaluación: ${evalCode || '—'}`, gridX, 42);

  const cellCounter = new Map<string, number>();
  for (const risk of risks) {
    const { probability, impact } = resolveCoords(risk, mode);
    if (probability == null || impact == null) continue;
    const cellKey = `${clampLevel(probability)}:${clampLevel(impact)}`;
    const indexInCell = cellCounter.get(cellKey) ?? 0;
    cellCounter.set(cellKey, indexInCell + 1);
    const [scatterImpact, scatterProbability] = computeJitteredCoords(impact, probability, indexInCell);
    const x = gridX + ((scatterImpact - 1) / 4) * gridW;
    const y = gridY + gridH - ((scatterProbability - 1) / 4) * gridH;

    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const legendX = width - 210;
  const legendY = 54;
  ctx.fillStyle = 'rgba(2,6,23,0.7)';
  heatMapRoundRect(ctx, legendX - 14, legendY - 18, 184, 170, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(148,163,184,0.2)';
  ctx.stroke();
  ctx.fillStyle = '#dbe4f0';
  ctx.font = '700 12px system-ui,sans-serif';
  ctx.fillText('Niveles', legendX, legendY);
  levels.slice().reverse().forEach((level, index) => {
    const rowY = legendY + 24 + index * 24;
    ctx.fillStyle = level.color;
    ctx.fillRect(legendX, rowY - 10, 12, 12);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 11px system-ui,sans-serif';
    ctx.fillText(level.name, legendX + 20, rowY);
  });
}

export function HeatMapModal({ runRaId, onClose }: { runRaId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ValuationData | null>(null);
  const [mode, setMode] = useState<HeatMapMode>('residual');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/linear-risk/risk-valuation?runRaId=${encodeURIComponent(runRaId)}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const body = await res.json() as ValuationData;
        if (res.ok) setData(body);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [runRaId]);

  const levels = (data?.catalogs?.risk_levels && data.catalogs.risk_levels.length > 0)
    ? data.catalogs.risk_levels
    : FALLBACK_LEVELS;

  const prepared = useMemo(() => {
    const risks = data?.risks ?? [];
    const inCellCounter = new Map<string, number>();

    const points = risks
      .map((risk) => {
        const coords = resolveCoords(risk, mode);
        if (coords.probability == null || coords.impact == null) return null;

        const cellKey = `${clampLevel(coords.probability)}:${clampLevel(coords.impact)}`;
        const indexInCell = inCellCounter.get(cellKey) ?? 0;
        inCellCounter.set(cellKey, indexInCell + 1);
        const [scatterImpact, scatterProbability] = computeJitteredCoords(coords.impact, coords.probability, indexInCell);
        const score = getRiskScore(risk, mode);
        const riskLabel = risk.code || risk.risk || 'Riesgo';
        const riskColor = getRiskColor(risk, mode);

        return {
          name: riskLabel,
          value: [scatterImpact, scatterProbability, score],
          symbolSize: 16 + Math.min(8, Math.max(0, score * 0.18)),
          itemStyle: {
            color: 'rgba(255,255,255,0.08)',
            borderColor: '#ffffff',
            borderWidth: 3,
            shadowBlur: 14,
            shadowColor: 'rgba(255,255,255,0.45)',
          },
          label: { show: false },
          tooltipHtml: [
            `<strong>${riskLabel}</strong>`,
            `${risk.risk}`,
            `Actividad: ${risk.activity || '—'}`,
            `Probabilidad inherente: ${risk.probability_score ?? '--'}`,
            `Impacto inherente: ${risk.impact_score ?? '--'}`,
            `Riesgo inherente: ${risk.inherent_score.toFixed(2)} · ${risk.inherent_level || '—'}`,
            `Riesgo residual: ${risk.residual_score.toFixed(2)} · ${risk.residual_level || '—'}`,
            `Métrica visualizada: ${mode === 'inherent' ? 'Inherente' : 'Residual'}`,
            `Color de referencia: ${riskColor}`,
          ].join('<br/>'),
        };
      })
      .filter((point): point is NonNullable<typeof point> => point !== null);

    const rankedRisks = [...risks]
      .sort((a, b) => getRiskScore(b, mode) - getRiskScore(a, mode))
      .slice(0, 10);

    return {
      points,
      rankedRisks,
      plottedCount: points.length,
      totalCount: risks.length,
    };
  }, [data, mode]);

  async function saveCurrentMode(currentData: ValuationData, currentMode: HeatMapMode) {
    setSaveStatus('saving');
    try {
      const canvas = document.createElement('canvas');
      drawHeatMapToCanvas(canvas, currentData.risks, levels, currentMode, currentData.meta.run_ra_code);
      const imageBase64 = canvas.toDataURL('image/png').split(',')[1];
      const res = await fetch('/api/linear-risk/heatmap-save', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runRaId, imageBase64, mode: currentMode }),
      });
      setSaveStatus(res.ok ? 'saved' : 'error');
    } catch {
      setSaveStatus('error');
    }
    window.setTimeout(() => setSaveStatus('idle'), 3000);
  }

  useEffect(() => {
    if (!data) return;
    void saveCurrentMode(data, mode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, mode]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const plottedPoints = useMemo(
    () =>
      prepared.points.map((point) => ({
        ...point,
        left: `${((Number(point.value[0]) - 1) / 4) * 100}%`,
        top: `${100 - ((Number(point.value[1]) - 1) / 4) * 100}%`,
      })),
    [prepared.points],
  );

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Mapa de calor de riesgo" onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconBadge}>
              <Flame size={18} />
            </div>
            <div className={styles.titleBlock}>
              <h3 className={styles.title}>Mapa de calor</h3>
              <p className={styles.subtitle}>Matriz 5x5 de impacto y probabilidad para la evaluación actual</p>
            </div>
            <div className={styles.metricSwitch}>
              <button
                type="button"
                className={`${styles.metricButton} ${mode === 'inherent' ? styles.metricButtonActive : ''}`}
                onClick={() => setMode('inherent')}
              >
                Riesgo inherente
              </button>
              <button
                type="button"
                className={`${styles.metricButton} ${mode === 'residual' ? styles.metricButtonActive : ''}`}
                onClick={() => setMode('residual')}
              >
                Riesgo residual
              </button>
            </div>
          </div>
          <div className={styles.headerRight}>
            {saveStatus !== 'idle' && (
              <span className={styles.saveStatus} data-state={saveStatus}>
                {saveStatus === 'saving' && <Loader2 size={14} className={styles.spin} />}
                {saveStatus === 'saved' && <CheckCircle2 size={14} />}
                {saveStatus === 'saving'
                  ? 'Guardando'
                  : saveStatus === 'saved'
                    ? 'Guardado'
                    : 'Error al guardar'}
              </span>
            )}
            <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar mapa de calor">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className={styles.body}>
          {loading ? (
            <div className={styles.loadingState}>
              <Loader2 size={30} className={styles.spin} />
            </div>
          ) : !data || data.risks.length === 0 ? (
            <div className={styles.emptyState}>No hay riesgos suficientes para construir el mapa de calor.</div>
          ) : (
            <>
              <div className={styles.chartWrap}>
                <div className={styles.chartMeta}>
                  <span>Evaluación: {data.meta.run_ra_code || '—'}</span>
                  <span>Puntos: {prepared.plottedCount}/{prepared.totalCount}</span>
                </div>
                <div className={styles.chartShell}>
                  <div className={styles.yAxisTitle}>Probabilidad</div>
                  <div className={styles.chartContent}>
                    <div className={styles.yAxisLabels}>
                      {probabilityAxis.slice().reverse().map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>
                    <div className={styles.plotArea}>
                      <svg className={styles.gridSvg} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                        {[0, 25, 50, 75, 100].map((value) => (
                          <line
                            key={`v-${value}`}
                            x1={value}
                            y1="0"
                            x2={value}
                            y2="100"
                            stroke="rgba(255,255,255,0.34)"
                            strokeWidth="0.22"
                          />
                        ))}
                        {[0, 25, 50, 75, 100].map((value) => (
                          <line
                            key={`h-${value}`}
                            x1="0"
                            y1={value}
                            x2="100"
                            y2={value}
                            stroke="rgba(255,255,255,0.34)"
                            strokeWidth="0.22"
                          />
                        ))}
                      </svg>
                      {plottedPoints.map((point) => (
                        <button
                          key={`${point.name}-${point.left}-${point.top}`}
                          type="button"
                          className={styles.plotPoint}
                          style={{
                            left: point.left,
                            top: point.top,
                            width: `${Number(point.symbolSize)}px`,
                            height: `${Number(point.symbolSize)}px`,
                          }}
                          title={point.tooltipHtml.replace(/<br\/>/g, '\n').replace(/<strong>|<\/strong>/g, '')}
                        />
                      ))}
                    </div>
                  </div>
                  <div className={styles.xAxisLabels}>
                    {impactAxis.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                  <div className={styles.xAxisTitle}>Impacto</div>
                </div>
              </div>

              <aside className={styles.sidePanel}>
                <div className={styles.sideCard}>
                  <h4 className={styles.sideTitle}>Niveles</h4>
                  <div className={styles.legendList}>
                    {levels.slice().reverse().map((level) => (
                      <div key={level.code} className={styles.legendItem}>
                        <span className={styles.legendSwatch} style={{ backgroundColor: level.color }} />
                        <span className={styles.legendLabel}>{level.name}</span>
                        <span className={styles.legendRange}>{level.min_score}-{level.max_score}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.sideCard}>
                  <h4 className={styles.sideTitle}>Top riesgos</h4>
                  <div className={styles.riskList}>
                    {prepared.rankedRisks.map((risk, index) => {
                      const score = getRiskScore(risk, mode);
                      const level = getRiskLevelLabel(risk, mode);
                      const color = getRiskColor(risk, mode);
                      return (
                        <div key={risk.id} className={styles.riskItem}>
                          <div className={styles.riskItemHead}>
                            <span className={styles.riskRank}>#{index + 1}</span>
                            <span className={styles.riskScore}>{score.toFixed(2)}</span>
                          </div>
                          <div className={styles.riskCodeRow}>
                            <span className={styles.riskDot} style={{ borderColor: color }} />
                            <span className={styles.riskCode}>{risk.code || 'RSK'}</span>
                          </div>
                          <div className={styles.riskName}>{risk.risk}</div>
                          <div className={styles.riskMeta}>
                            <span style={{ color }}>{level}</span>
                            <span>{risk.activity || 'Sin actividad'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </aside>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

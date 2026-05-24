'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, FileText, Loader2, LogOut, ShieldCheck } from 'lucide-react';
import { CARD, CopyRunCodeButton, ExitDialog, STEPS, WIZARD_SURFACE_BG, WIZARD_SURFACE_BORDER, WIZARD_SURFACE_SHADOW } from './ContextWizardShared';
import { StepContexto } from './StepContexto';
import { StepAnalisisRiesgo } from './StepAnalisisRiesgo';
import { StepAnalisisControl } from './StepAnalisisControl';
import { StepValoracion } from './StepValoracion';
import { StepTratamiento } from './StepTratamiento';

function StepPlaceholder({ step }: { step: typeof STEPS[number] }) {
  return (
    <div style={{
      ...CARD,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '1.25rem', padding: '5rem 2rem', textAlign: 'center', minHeight: 360,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6',
      }}>
        <step.Icon size={30} strokeWidth={1.5} />
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#64748b', letterSpacing: '-0.02em' }}>
          {step.label}
        </h3>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#3b4a6b', maxWidth: 380, lineHeight: 1.6 }}>
          {step.desc}
        </p>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#3b4a6b', maxWidth: 360 }}>
          Completa las etapas anteriores para habilitar este módulo.
        </p>
      </div>
      <span style={{
        fontSize: '0.7rem', fontWeight: 700, padding: '0.28rem 0.85rem', borderRadius: 999,
        background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.18)', color: '#475569',
      }}>
        Disponible en la siguiente fase
      </span>
    </div>
  );
}

export function EvaluationWizard({ runRaId, runRaCode, onExit }: {
  runRaId: string;
  runRaCode: string;
  onExit: (action: 'draft' | 'delete') => void;
}) {
  const [step, setStep] = useState(1);
  const [showExit, setShowExit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [evaluatedProcess, setEvaluatedProcess] = useState('');
  const [lifecycleCode, setLifecycleCode] = useState('DRAFT');
  const [progressPercent, setProgressPercent] = useState(0);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    async function loadMeta() {
      try {
        const gcRes = await fetch(`/api/linear-risk/general-context?runRaId=${encodeURIComponent(runRaId)}`, { cache: 'no-store' });
        const gcData = await gcRes.json() as {
          context?: { objeto_evaluado?: string; element_id?: string; activity_id?: string } | null;
          elements?: Array<{ id: string; name: string }>;
          activities?: Array<{ id: string; name: string }>;
        };
        const selectedElementId = String(gcData?.context?.element_id ?? '').trim();
        const selectedActivityId = String(gcData?.context?.activity_id ?? '').trim();
        const processName = gcData.elements?.find((e) => e.id === selectedElementId)?.name?.trim() || '';
        const activityName = gcData.activities?.find((a) => a.id === selectedActivityId)?.name?.trim() || '';
        const processFromStep1 = processName || activityName || String(gcData?.context?.objeto_evaluado ?? '').trim();

        if (processFromStep1) {
          setEvaluatedProcess(processFromStep1);
          return;
        }

        const internalRes = await fetch(`/api/linear-risk/internal-external?runRaId=${encodeURIComponent(runRaId)}&type=INTERNO`, { cache: 'no-store' });
        const internalData = await internalRes.json() as { context?: { procesos?: string } | null };
        const processFromInternal = String(internalData?.context?.procesos ?? '').trim();
        if (processFromInternal) {
          setEvaluatedProcess(processFromInternal);
          return;
        }

        const res = await fetch(`/api/linear-risk/analysis-risks?runRaId=${encodeURIComponent(runRaId)}`, { cache: 'no-store' });
        const data = await res.json() as { meta?: { evaluated_process?: string } };
        const processFromMeta = String(data.meta?.evaluated_process ?? '').trim();
        if (processFromMeta) {
          setEvaluatedProcess(processFromMeta);
        }
      } catch (e) {
        console.error('Error loading process meta:', e);
      }
    }
    void loadMeta();
  }, [runRaId]);

  useEffect(() => {
    async function loadLifecycle() {
      try {
        const res = await fetch('/api/linear-risk/evaluations', { cache: 'no-store' });
        const data = await res.json() as {
          evaluations?: Array<{ id: string; progress: number; lifecycle_code?: string | null }>;
        };
        const run = data.evaluations?.find((e) => e.id === runRaId);
        if (run) {
          setProgressPercent(Number(run.progress ?? 0));
          setLifecycleCode(String(run.lifecycle_code ?? 'DRAFT'));
        }
      } catch {
        return;
      }
    }
    void loadLifecycle();
  }, [runRaId, step]);

  const lifecycleMap: Record<string, { label: string; color: string; bg: string; border: string }> = {
    DRAFT: { label: 'BORRADOR', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.22)' },
    IN_PROGRESS: { label: 'EN PROCESO', color: '#38bdf8', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.22)' },
    IN_TREATMENT: { label: 'EN TRATAMIENTO', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)' },
    COMPLETED: { label: 'COMPLETADA', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.28)' },
    CANCELLED: { label: 'CANCELADA', color: '#fb7185', bg: 'rgba(251,113,133,0.10)', border: 'rgba(251,113,133,0.26)' },
    REOPENED: { label: 'REABIERTA', color: '#22d3ee', bg: 'rgba(34,211,238,0.10)', border: 'rgba(34,211,238,0.26)' },
    DELETED: { label: 'ELIMINADA', color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.26)' },
  };
  const lifecycleUi = lifecycleMap[lifecycleCode] ?? lifecycleMap.DRAFT;
  const current = STEPS[step - 1];

  async function handleGenerateReport() {
    setGeneratingReport(true);
    try {
      const res = await fetch(
        `/api/linear-risk/generate-report?runRaId=${encodeURIComponent(runRaId)}`,
        { credentials: 'include' },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `informe_${runRaCode || runRaId.slice(0, 8)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'No se pudo generar el informe.');
    } finally {
      setGeneratingReport(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch('/api/linear-risk/run-ra', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: runRaId }),
      });
      if (!res.ok) {
        throw new Error(`No se pudo cancelar la evaluación (HTTP ${res.status}).`);
      }
      onExit('delete');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'No se pudo cancelar la evaluación.');
    } finally {
      setDeleting(false);
    }
  }

  async function handleFinalize() {
    if (!window.confirm('¿Estás seguro de que deseas finalizar la evaluación? Esto cerrará formalmente la edición.')) return;
    setFinalizing(true);
    try {
      const res = await fetch('/api/linear-risk/run-ra', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: runRaId,
          to_state: 'COMPLETED',
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      setLifecycleCode('COMPLETED');
      setProgressPercent(100);
      alert('Evaluación finalizada con éxito.');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'No se pudo finalizar la evaluación.');
    } finally {
      setFinalizing(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'transparent',
      display: 'flex', flexDirection: 'column', fontFamily: 'inherit',
    }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)',
        padding: '1rem 1.4rem 0.35rem',
      }}>
        <div style={{
          maxWidth: 1380,
          margin: '0 auto',
          background: WIZARD_SURFACE_BG,
          border: WIZARD_SURFACE_BORDER,
          borderRadius: 22,
          boxShadow: WIZARD_SURFACE_SHADOW,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '0.95rem 1.15rem 0.8rem',
            display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(124,58,237,0.14)',
                  border: '1px solid rgba(167,139,250,0.28)',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={24} color="#c084fc" />
              </div>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#e7efff', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                Evaluación de riesgo
              </h2>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                background: lifecycleUi.bg, border: `1px solid ${lifecycleUi.border}`,
                borderRadius: 999, padding: '0.2rem 0.62rem',
                fontSize: '0.62rem', fontWeight: 700, color: lifecycleUi.color, letterSpacing: '0.06em',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: lifecycleUi.color }} />
                {`${lifecycleUi.label} (${progressPercent}%)`}
              </span>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.55rem',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '0.45rem 0.85rem',
            }}>
              <span style={{ fontSize: '0.71rem', color: '#7b8fad', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ID evaluación
              </span>
              <code style={{ fontSize: '0.92rem', color: '#22d3ee', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                {runRaCode || runRaId.slice(0, 16) + '…'}
              </code>
              <CopyRunCodeButton value={runRaCode || runRaId} />
            </div>

            <span style={{ fontSize: '0.72rem', color: '#8ca0be', fontWeight: 700, whiteSpace: 'nowrap' }}>
              Paso {step} / {STEPS.length}
            </span>

            <button
              onClick={() => {
                if (lifecycleCode === 'COMPLETED') {
                  onExit('draft');
                } else {
                  setShowExit(true);
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.45rem 0.9rem', borderRadius: 12,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#fda4af', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
              <LogOut size={13} /> Salir
            </button>
          </div>

          <div style={{ padding: '0 0.8rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {step >= 2 && step <= 5 && (
              <div style={{
                margin: '0 0.35rem',
                padding: '0.68rem 0.9rem',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                color: '#c4b5fd',
                fontSize: '0.74rem',
                fontWeight: 700,
              }}>
                Proceso evaluado: {evaluatedProcess || 'No definido en paso 1'}
              </div>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'stretch',
              overflowX: 'auto',
              gap: '0.45rem',
              padding: '0.1rem 0.15rem 0.15rem',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 18,
            }}>
              {STEPS.map((s, i) => {
                const active = s.id === step;
                const done = s.id < step;
                return (
                  <button key={s.key} onClick={() => setStep(s.id)} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.72rem 0.95rem',
                    background: active ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${active ? 'rgba(59,130,246,0.22)' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: 14,
                    cursor: 'pointer',
                    color: active ? '#93c5fd' : done ? '#6ee7b7' : '#6f83a3',
                    fontSize: '0.76rem',
                    fontWeight: active ? 700 : 600,
                    whiteSpace: 'nowrap',
                    transition: 'color .15s',
                    flexShrink: 0,
                  }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.62rem', fontWeight: 800,
                      background: active ? 'rgba(59,130,246,0.18)' : done ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${active ? 'rgba(59,130,246,0.28)' : done ? 'rgba(16,185,129,0.24)' : 'rgba(255,255,255,0.08)'}`,
                      color: active ? '#93c5fd' : done ? '#6ee7b7' : '#8ca0be',
                    }}>
                      {done ? <CheckCircle2 size={10} /> : s.id}
                    </span>
                    <s.Icon size={13} />
                    {s.label}
                    {i < STEPS.length - 1 && <ChevronRight size={11} style={{ marginLeft: '0.1rem', color: 'rgba(140,160,190,0.45)' }} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '1.45rem 2rem 2rem', maxWidth: (step === 2 || step === 3 || step === 4 || step === 5) ? '96%' : 1152, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {step !== 1 && step !== 2 && step !== 3 && (
          <div style={{ marginBottom: '1.35rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.025em' }}>
              {current.label}
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
              {current.desc}
            </p>
          </div>
        )}

        {step === 1
          ? (
            <section
              style={{
                ...CARD,
                borderRadius: 22,
                padding: '1.2rem 1.2rem 1.3rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '1.12rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                    Evaluación de riesgo
                  </h2>
                  <p style={{ margin: '0.22rem 0 0', color: '#8fa3c2', fontSize: '0.78rem', lineHeight: 1.45 }}>
                    Complete el contexto general de la evaluación antes de continuar con el análisis.
                  </p>
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.42rem 0.75rem',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#9fb0cb',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                  }}
                >
                  Paso inicial
                </span>
              </div>
              <StepContexto runRaId={runRaId} />
            </section>
          )
          : step === 2
            ? <StepAnalisisRiesgo runRaId={runRaId} />
            : step === 3
              ? <StepAnalisisControl runRaId={runRaId} />
              : step === 4
                ? <StepValoracion runRaId={runRaId} />
                : step === 5
                  ? <StepTratamiento runRaId={runRaId} />
                  : <StepPlaceholder step={current} />}
      </div>

      <div style={{
        position: 'sticky', bottom: 0, zIndex: 100,
        padding: '0 1.4rem 1rem', backdropFilter: 'blur(12px)',
      }}>
        <div style={{
          maxWidth: 1380,
          margin: '0 auto',
          background: WIZARD_SURFACE_BG,
          border: WIZARD_SURFACE_BORDER,
          borderRadius: 22,
          boxShadow: WIZARD_SURFACE_SHADOW,
          padding: '0.8rem 1.15rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        }}>
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.6rem 1.05rem', borderRadius: 12,
              background: step === 1 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${step === 1 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.09)'}`,
              color: step === 1 ? '#41516e' : '#a8b6cc', fontSize: '0.8rem', fontWeight: 700,
              cursor: step === 1 ? 'not-allowed' : 'pointer',
            }}>
            <ChevronLeft size={14} /> Anterior
          </button>

          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            {STEPS.map((s) => (
              <div key={s.id} style={{
                width: s.id === step ? 22 : 6, height: 6, borderRadius: 999,
                background: s.id === step ? '#3b82f6' : s.id < step ? '#34d399' : 'rgba(255,255,255,0.1)',
                transition: 'all .2s',
              }} />
            ))}
          </div>

          {step < STEPS.length ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.45rem',
                padding: '0.6rem 1.1rem', borderRadius: 12,
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: '1px solid rgba(59,130,246,0.32)',
                color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 8px 18px rgba(59,130,246,0.18)',
              }}>
              Siguiente <ChevronRight size={14} />
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.45rem',
                  padding: '0.6rem 1.05rem', borderRadius: 12,
                  background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  color: '#93c5fd', fontSize: '0.8rem', fontWeight: 700,
                  cursor: generatingReport ? 'not-allowed' : 'pointer',
                  opacity: generatingReport ? 0.7 : 1,
                }}
              >
                {generatingReport
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generando…</>
                  : <><FileText size={14} /> Generar informe</>}
              </button>

              <button
                onClick={handleFinalize}
                disabled={finalizing || lifecycleCode === 'COMPLETED'}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.45rem',
                  padding: '0.6rem 1.1rem', borderRadius: 12,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: '1px solid rgba(16,185,129,0.34)',
                  color: '#fff', fontSize: '0.8rem', fontWeight: 700,
                  cursor: (finalizing || lifecycleCode === 'COMPLETED') ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 18px rgba(16,185,129,0.16)',
                  opacity: (finalizing || lifecycleCode === 'COMPLETED') ? 0.7 : 1,
                }}
              >
                {finalizing
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Finalizando…</>
                  : <><CheckCircle2 size={14} /> Finalizar evaluación</>}
              </button>
            </div>
          )}
        </div>
      </div>

      {showExit && (
        <ExitDialog
          onContinue={() => setShowExit(false)}
          onDraft={() => onExit('draft')}
          onDelete={handleDelete}
          deleting={deleting}
        />
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

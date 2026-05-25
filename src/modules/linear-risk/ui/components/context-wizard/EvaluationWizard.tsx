'use client';

import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, ChevronLeft, ChevronRight, FileText, Globe, Loader2, LogOut, Save, Users, X } from 'lucide-react';
import { CARD, CopyRunCodeButton, ExitDialog, STEPS, WIZARD_SURFACE_BG, WIZARD_SURFACE_BORDER, WIZARD_SURFACE_SHADOW } from './ContextWizardShared';
import { StepAnalisisRiesgo } from './StepAnalisisRiesgo';
import { StepAnalisisControl } from './StepAnalisisControl';
import { StepValoracion } from './StepValoracion';
import { StepTratamiento } from './StepTratamiento';
import { EvaluacionTab, ExternoTab, InternoTab } from './ContextWizardShared';

const STEP_ONE_FLOW = [
  { id: 1, title: 'Definir contexto', subtitle: 'Entender el entorno' },
  { id: 2, title: 'Identificar riesgos', subtitle: 'Reconocer amenazas' },
  { id: 3, title: 'Evaluar controles', subtitle: 'Revisar y analizar' },
  { id: 4, title: 'Calcular exposición', subtitle: 'Determinar el nivel de riesgo' },
  { id: 5, title: 'Definir tratamiento', subtitle: 'Seleccionar acciones' },
] as const;

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
  const [showEvaluationContextModal, setShowEvaluationContextModal] = useState(false);
  const [showExternalContextModal, setShowExternalContextModal] = useState(false);
  const [showInternalContextModal, setShowInternalContextModal] = useState(false);

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
  const stepOneProgress = Math.max(progressPercent, 20);

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
        {step === 1 ? (
          <>
            {/* Title row — sin card, solo línea inferior */}
            <div style={{
              maxWidth: 1380,
              margin: '0 auto',
              borderBottom: '1px solid rgba(117,145,199,0.18)',
              padding: '0.85rem 0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f2f7ff', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                    Evaluación de riesgo
                  </h2>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'rgba(251,191,36,0.1)',
                    border: '1px solid rgba(251,191,36,0.35)',
                    borderRadius: 999,
                    padding: '0.28rem 0.95rem',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    color: '#fbbf24',
                    letterSpacing: '0.04em',
                    lineHeight: 1,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24' }} />
                    {lifecycleUi.label}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14,
                  padding: '0.5rem 0.9rem 0.5rem 1rem',
                }}>
                  <span style={{ fontSize: '0.7rem', color: '#7b8fad', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    ID Evaluación
                  </span>
                  <code style={{ fontSize: '0.88rem', color: '#22d3ee', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.03em' }}>
                    {runRaCode || runRaId.slice(0, 16) + '…'}
                  </code>
                  <CopyRunCodeButton value={runRaCode || runRaId} />
                </div>

                <button
                  onClick={() => {
                    if (lifecycleCode === 'COMPLETED') {
                      onExit('draft');
                    } else {
                      setShowExit(true);
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.45rem',
                    padding: '0.6rem 1.05rem', borderRadius: 12,
                    background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.28)',
                    color: '#fda4af', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}>
                  <LogOut size={14} /> Salir
                </button>
              </div>
            </div>

            {/* Step bar — fuera del card, sobre el fondo de página */}
            <div style={{ maxWidth: 1380, margin: '0 auto', padding: '1.8rem 0.4rem 0.2rem' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                gap: '0.5rem',
              }}>
                {STEP_ONE_FLOW.map((item, index) => {
                  const active = item.id === step;
                  const done = item.id < step;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStep(item.id)}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        background: 'transparent',
                        border: 'none',
                        padding: '0.4rem 0',
                        color: active ? '#f3f8ff' : done ? '#d8ffe8' : '#d5e1f4',
                        cursor: 'pointer',
                        textAlign: 'left',
                        minWidth: 0,
                        width: '100%',
                      }}
                    >
                      <span style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: active ? 'linear-gradient(180deg, #68a5ff 0%, #4b89ff 100%)' : 'rgba(255,255,255,0.06)',
                        border: `1.5px solid ${active ? 'rgba(147,197,253,0.5)' : done ? 'rgba(110,231,183,0.28)' : 'rgba(255,255,255,0.18)'}`,
                        color: active ? '#ffffff' : done ? '#86efac' : '#d7e6ff',
                        boxShadow: active ? '0 0 20px rgba(59,130,246,0.28)' : 'none',
                        flexShrink: 0,
                        fontSize: '0.9rem',
                        fontWeight: 800,
                      }}>
                        {item.id}
                      </span>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: 'block', fontSize: '0.86rem', fontWeight: active ? 800 : 700, color: 'inherit', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                          {item.title}
                        </span>
                        <span style={{ display: 'block', marginTop: '0.2rem', fontSize: '0.74rem', color: active ? '#b8d2ff' : '#7a90b0', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                          {item.subtitle}
                        </span>
                      </span>
                      {index < STEP_ONE_FLOW.length - 1 ? (
                        <ChevronRight size={15} style={{ color: 'rgba(140,165,200,0.6)', flexShrink: 0 }} />
                      ) : null}
                      {active ? (
                        <span style={{
                          position: 'absolute',
                          left: 0,
                          right: index < STEP_ONE_FLOW.length - 1 ? 20 : 0,
                          bottom: '-0.25rem',
                          height: 2,
                          borderRadius: 999,
                          background: '#5ea0ff',
                        }} />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Title row — igual que paso 1 */}
            <div style={{
              maxWidth: 1380,
              margin: '0 auto',
              borderBottom: '1px solid rgba(117,145,199,0.18)',
              padding: '0.85rem 0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f2f7ff', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                    Evaluación de riesgo
                  </h2>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    background: lifecycleUi.bg, border: `1px solid ${lifecycleUi.border}`,
                    borderRadius: 999, padding: '0.28rem 0.95rem',
                    fontSize: '0.7rem', fontWeight: 800, color: lifecycleUi.color, letterSpacing: '0.04em', lineHeight: 1,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: lifecycleUi.color }} />
                    {lifecycleUi.label}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.55rem',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14, padding: '0.5rem 0.9rem 0.5rem 1rem',
                }}>
                  <span style={{ fontSize: '0.7rem', color: '#7b8fad', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    ID Evaluación
                  </span>
                  <code style={{ fontSize: '0.88rem', color: '#22d3ee', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.03em' }}>
                    {runRaCode || runRaId.slice(0, 16) + '…'}
                  </code>
                  <CopyRunCodeButton value={runRaCode || runRaId} />
                </div>
                <button
                  onClick={() => { if (lifecycleCode === 'COMPLETED') { onExit('draft'); } else { setShowExit(true); } }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.45rem',
                    padding: '0.6rem 1.05rem', borderRadius: 12,
                    background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.28)',
                    color: '#fda4af', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}>
                  <LogOut size={14} /> Salir
                </button>
              </div>
            </div>

            {/* Step bar — igual que paso 1 */}
            <div style={{ maxWidth: 1380, margin: '0 auto', padding: '1.8rem 0.4rem 0.2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '0.5rem' }}>
                {STEP_ONE_FLOW.map((item, index) => {
                  const active = item.id === step;
                  const done = item.id < step;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStep(item.id)}
                      style={{
                        position: 'relative',
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        background: 'transparent', border: 'none',
                        padding: '0.4rem 0',
                        color: active ? '#f3f8ff' : done ? '#d8ffe8' : '#d5e1f4',
                        cursor: 'pointer', textAlign: 'left', minWidth: 0, width: '100%',
                      }}
                    >
                      <span style={{
                        width: 36, height: 36, borderRadius: '50%',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: active ? 'linear-gradient(180deg, #68a5ff 0%, #4b89ff 100%)' : done ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.06)',
                        border: `1.5px solid ${active ? 'rgba(147,197,253,0.5)' : done ? 'rgba(110,231,183,0.28)' : 'rgba(255,255,255,0.18)'}`,
                        color: active ? '#ffffff' : done ? '#86efac' : '#d7e6ff',
                        boxShadow: active ? '0 0 20px rgba(59,130,246,0.28)' : 'none',
                        flexShrink: 0, fontSize: '0.9rem', fontWeight: 800,
                      }}>
                        {done ? <CheckCircle2 size={14} /> : item.id}
                      </span>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: 'block', fontSize: '0.86rem', fontWeight: active ? 800 : 700, color: 'inherit', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                          {item.title}
                        </span>
                        <span style={{ display: 'block', marginTop: '0.2rem', fontSize: '0.74rem', color: active ? '#b8d2ff' : '#7a90b0', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                          {item.subtitle}
                        </span>
                      </span>
                      {index < STEP_ONE_FLOW.length - 1 && (
                        <ChevronRight size={15} style={{ color: 'rgba(140,165,200,0.6)', flexShrink: 0 }} />
                      )}
                      {active && (
                        <span style={{
                          position: 'absolute', left: 0,
                          right: index < STEP_ONE_FLOW.length - 1 ? 20 : 0,
                          bottom: '-0.25rem', height: 2, borderRadius: 999, background: '#5ea0ff',
                        }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ flex: 1, padding: step === 1 ? '2.5rem 2rem 2rem' : '1.45rem 2rem 2rem', maxWidth: step === 1 ? 1380 : (step === 2 || step === 3 || step === 4 || step === 5) ? '96%' : 1152, width: '100%', margin: '0 auto', boxSizing: 'border-box', display: step === 1 ? 'flex' : undefined, alignItems: step === 1 ? 'center' : undefined, justifyContent: step === 1 ? 'center' : undefined }}>
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
            <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.4rem' }}>
                {[
                  {
                    key: 'interno',
                    title: 'Contexto interno',
                    description: 'Define los aspectos internos del activo o proceso, incluyendo estructura, recursos, procesos y objetivos.',
                    Icon: Building2,
                    onClick: () => setShowInternalContextModal(true),
                  },
                  {
                    key: 'externo',
                    title: 'Contexto externo',
                    description: 'Analiza factores externos que pueden influir en el activo o proceso, como proveedores, regulaciones y terceros.',
                    Icon: Users,
                    onClick: () => setShowExternalContextModal(true),
                  },
                  {
                    key: 'general',
                    title: 'Contexto general',
                    description: 'Establece el panorama general del entorno, incluyendo alcance, dependencias y criterios de evaluación.',
                    Icon: Globe,
                    onClick: () => setShowEvaluationContextModal(true),
                  },
                ].map((card) => (
                  <button
                    key={card.key}
                    type="button"
                    onClick={card.onClick}
                    style={{
                      minHeight: 172,
                      borderRadius: 18,
                      border: '1px solid rgba(125,157,212,0.24)',
                      background: 'linear-gradient(180deg, rgba(21,49,110,0.58) 0%, rgba(12,34,84,0.78) 100%)',
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02)',
                      padding: '1.25rem 1.25rem 1.15rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      gap: '1rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(180deg, rgba(54,112,228,0.42) 0%, rgba(37,99,235,0.2) 100%)',
                      border: '1px solid rgba(96,165,250,0.22)',
                    }}>
                      <card.Icon size={20} color="#8fc0ff" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#eef5ff' }}>
                          {card.title}
                        </h4>
                        <ChevronRight size={16} color="#c6d7f3" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                      </div>
                      <p style={{ margin: '0.75rem 0 0', fontSize: '0.84rem', color: '#b1c5e4', lineHeight: 1.55 }}>
                        {card.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
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
        {step === 1 ? (
          <div style={{
            maxWidth: 1380,
            margin: '0 auto',
            borderTop: '1px solid rgba(117,145,199,0.18)',
            padding: '0.85rem 0.4rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <button
              type="button"
              onClick={() => onExit('draft')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.55rem',
                padding: '0.75rem 1.1rem',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#d7e6ff',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                justifySelf: 'start',
              }}>
              <Save size={14} />
              Guardar borrador
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', minWidth: 0 }}>
              <span style={{ fontSize: '0.82rem', color: '#9bb5d9' }}>Progreso</span>
              <span style={{ fontSize: '1rem', color: '#56a1ff', fontWeight: 800, minWidth: 36 }}>{stepOneProgress}%</span>
              <div style={{
                width: 'min(240px, 100%)',
                height: 6,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${stepOneProgress}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, #4f92ff 0%, #3b82f6 100%)',
                }} />
              </div>
            </div>

            <button
              onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem',
                padding: '0.82rem 1.2rem', borderRadius: 12,
                background: 'linear-gradient(135deg, #4b95ff, #337cff)',
                border: '1px solid rgba(96,165,250,0.34)',
                color: '#fff', fontSize: '0.92rem', fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 10px 24px rgba(59,130,246,0.22)',
                justifySelf: 'end',
              }}>
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          <div style={{
            maxWidth: 1380,
            margin: '0 auto',
            borderTop: '1px solid rgba(117,145,199,0.18)',
            padding: '0.85rem 0.4rem',
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
        )}
      </div>

      {showExit && (
        <ExitDialog
          onContinue={() => setShowExit(false)}
          onDraft={() => onExit('draft')}
          onDelete={handleDelete}
          deleting={deleting}
        />
      )}
      {showEvaluationContextModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 220,
            background: 'rgba(2, 6, 23, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
        >
          <div
            style={{
              width: 'min(1100px, 96vw)',
              maxHeight: '88vh',
              overflowY: 'auto',
              ...CARD,
              borderRadius: 22,
              padding: '1.2rem 1.2rem 1.3rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1rem', fontWeight: 800 }}>Contexto evaluación</h3>
                <p style={{ margin: '0.2rem 0 0', color: '#97a8c4', fontSize: '0.76rem', lineHeight: 1.45 }}>
                  Define el alcance, el proceso y el apetito general de riesgo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEvaluationContextModal(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#9fb0cb',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>
            <EvaluacionTab runRaId={runRaId} />
          </div>
        </div>
      )}
      {showExternalContextModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 220,
            background: 'rgba(2, 6, 23, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
        >
          <div
            style={{
              width: 'min(1100px, 96vw)',
              maxHeight: '88vh',
              overflowY: 'auto',
              ...CARD,
              borderRadius: 22,
              padding: '1.2rem 1.2rem 1.3rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1rem', fontWeight: 800 }}>Contexto externo</h3>
                <p style={{ margin: '0.2rem 0 0', color: '#97a8c4', fontSize: '0.76rem', lineHeight: 1.45 }}>
                  Factores externos que pueden influir en los riesgos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExternalContextModal(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#9fb0cb',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>
            <ExternoTab runRaId={runRaId} />
          </div>
        </div>
      )}
      {showInternalContextModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 220,
            background: 'rgba(2, 6, 23, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
        >
          <div
            style={{
              width: 'min(1100px, 96vw)',
              maxHeight: '88vh',
              overflowY: 'auto',
              ...CARD,
              borderRadius: 22,
              padding: '1.2rem 1.2rem 1.3rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1rem', fontWeight: 800 }}>Contexto interno</h3>
                <p style={{ margin: '0.2rem 0 0', color: '#97a8c4', fontSize: '0.76rem', lineHeight: 1.45 }}>
                  Recursos, capacidades y factores internos de la organización.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInternalContextModal(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#9fb0cb',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>
            <InternoTab runRaId={runRaId} />
          </div>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

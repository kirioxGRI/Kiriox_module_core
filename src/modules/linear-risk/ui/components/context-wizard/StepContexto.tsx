'use client';

import React from 'react';
import { Globe, Home, Target } from 'lucide-react';
import { EvaluacionTab, ExternoTab, InternoTab, SectionBlock } from './ContextWizardShared';

export function StepContexto({
  runRaId,
  showEvaluationInline = true,
  showExternalInline = true,
  showInternalInline = true,
}: {
  runRaId: string;
  showEvaluationInline?: boolean;
  showExternalInline?: boolean;
  showInternalInline?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      {showEvaluationInline ? (
        <SectionBlock
          title="Contexto evaluación"
          subtitle="Define el alcance, el proceso y el apetito general de riesgo."
          badge="Campos obligatorios *"
          color="#f59e0b"
          Icon={Target}
          hideIcon
        >
          <EvaluacionTab runRaId={runRaId} />
        </SectionBlock>
      ) : null}
      {showExternalInline ? (
        <SectionBlock
          title="Contexto externo"
          subtitle="Factores externos que pueden influir en los riesgos."
          color="#a78bfa"
          Icon={Globe}
          hideIcon
        >
          <ExternoTab runRaId={runRaId} />
        </SectionBlock>
      ) : null}
      {showInternalInline ? (
        <SectionBlock
          title="Contexto interno"
          subtitle="Recursos, capacidades y factores internos de la organización."
          color="#22c55e"
          Icon={Home}
          hideIcon
        >
          <InternoTab runRaId={runRaId} />
        </SectionBlock>
      ) : null}
    </div>
  );
}

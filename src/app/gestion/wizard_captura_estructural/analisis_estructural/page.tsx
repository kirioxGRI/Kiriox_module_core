import React, { Suspense } from 'react';
import StructuralAnalysisResultPage from '@/modules/structural-risk/ui/pages/StructuralAnalysisResultPage';

export default function Page() {
  return (
    <Suspense fallback={<div style={{ color: '#94a3b8', fontSize: '0.82rem', padding: '2rem' }}>Cargando análisis estructural...</div>}>
      <StructuralAnalysisResultPage />
    </Suspense>
  );
}

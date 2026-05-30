import React, { Suspense } from 'react';
import StructuralCaptureWizardPage from '@/modules/structural-risk/ui/pages/StructuralCaptureWizardPage';

export default function Page() {
  return (
    <Suspense fallback={<div style={{ color: '#94a3b8', fontSize: '0.82rem', padding: '2rem' }}>Cargando capturador estructural...</div>}>
      <StructuralCaptureWizardPage />
    </Suspense>
  );
}

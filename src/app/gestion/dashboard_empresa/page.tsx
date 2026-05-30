import React, { Suspense } from 'react';
import { CompanyEditorPage } from "@/modules/company/ui/pages";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ color: '#94a3b8', fontSize: '0.82rem', padding: '2rem' }}>Cargando empresa...</div>}>
      <CompanyEditorPage />
    </Suspense>
  );
}

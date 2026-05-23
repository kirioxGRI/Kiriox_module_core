import { Suspense } from 'react';
import GovernanceProcessPage from './GovernanceProcessPage';

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: 'var(--secondary)' }}>Cargando...</div>}>
      <GovernanceProcessPage />
    </Suspense>
  );
}

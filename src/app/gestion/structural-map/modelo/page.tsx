import { Suspense } from 'react';
import ModeloCanvasPage from '@/modules/structural-map/ui/pages/ModeloCanvasPage';

export default function GestionStructuralMapModeloPage() {
  return (
    <Suspense>
      <ModeloCanvasPage />
    </Suspense>
  );
}

import { redirect } from 'next/navigation';
import ServiceBuilderPage from '@/modules/structural-map/ui/pages/ServiceBuilderPage';

type Props = {
  searchParams: Promise<{
    serviceId?: string;
  }>;
};

export default async function StructuralMapBuilderModelPage({ searchParams }: Props) {
  const { serviceId } = await searchParams;

  if (!serviceId) {
    redirect('/gestion/structural-map');
  }

  return <ServiceBuilderPage serviceId={serviceId} />;
}

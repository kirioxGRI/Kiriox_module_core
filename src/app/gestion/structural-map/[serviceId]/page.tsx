import ServiceBuilderPage from '@/modules/structural-map/ui/pages/ServiceBuilderPage';

type Props = { params: Promise<{ serviceId: string }> };

export default async function StructuralMapBuilderPage({ params }: Props) {
  const { serviceId } = await params;
  return <ServiceBuilderPage serviceId={serviceId} />;
}

import { redirect } from 'next/navigation';

type Props = { params: Promise<{ serviceId: string }> };

export default async function StructuralMapBuilderPage({ params }: Props) {
  const { serviceId } = await params;
  redirect(`/gestion/structural-map/modelo?serviceId=${serviceId}`);
}

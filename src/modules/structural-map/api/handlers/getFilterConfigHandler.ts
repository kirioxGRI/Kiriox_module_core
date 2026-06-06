import { NextResponse } from 'next/server';
import { PrismaFilterRepository } from '@/modules/structural-map/infrastructure/PrismaFilterRepository';

const repo = new PrismaFilterRepository();

export async function getFilterConfigHandler(entityId?: string | null): Promise<NextResponse> {
  const data = await repo.getFilterConfig(entityId);
  return NextResponse.json(data);
}

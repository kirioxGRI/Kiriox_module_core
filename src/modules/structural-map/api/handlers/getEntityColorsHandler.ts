import { NextResponse } from 'next/server';
import { PrismaEntityColorRepository } from '@/modules/structural-map/infrastructure/PrismaEntityColorRepository';

const repo = new PrismaEntityColorRepository();

export async function getEntityColorsHandler(): Promise<NextResponse> {
  const colors = await repo.getColorMap();
  return NextResponse.json(colors);
}

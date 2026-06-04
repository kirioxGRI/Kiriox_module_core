import { NextResponse } from 'next/server';
import { PrismaModeloRepository } from '@/modules/structural-map/infrastructure/PrismaModeloRepository';

const repo = new PrismaModeloRepository();

export async function getModeloGraphHandler(): Promise<NextResponse> {
  const data = await repo.getFullGraph();
  return NextResponse.json(data);
}

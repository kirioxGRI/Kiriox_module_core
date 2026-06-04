import { NextResponse } from 'next/server';
import { PrismaGraphRepository } from '@/modules/structural-map/infrastructure/PrismaGraphRepository';

const repo = new PrismaGraphRepository();

export async function getGraphHandler(rootEntityId: string, depth: number): Promise<NextResponse> {
  if (!rootEntityId) return NextResponse.json({ error: 'rootEntityId requerido' }, { status: 400 });
  const clampedDepth = Math.max(1, Math.min(depth, 4));
  const data = await repo.getSubgraph(rootEntityId, clampedDepth);
  return NextResponse.json(data);
}

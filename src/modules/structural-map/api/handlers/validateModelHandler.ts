import { NextResponse } from 'next/server';
import { PrismaPortfolioRepository } from '@/modules/structural-map/infrastructure/PrismaPortfolioRepository';

const repo = new PrismaPortfolioRepository();

export async function validateModelHandler(rootEntityId: string): Promise<NextResponse> {
  if (!rootEntityId) return NextResponse.json({ error: 'rootEntityId requerido' }, { status: 400 });
  const result = await repo.validateModel(rootEntityId);
  return NextResponse.json(result);
}

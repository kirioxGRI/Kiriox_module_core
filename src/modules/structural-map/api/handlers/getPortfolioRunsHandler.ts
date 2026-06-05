import { NextResponse } from 'next/server';
import { PrismaPortfolioRepository } from '@/modules/structural-map/infrastructure/PrismaPortfolioRepository';

const repo = new PrismaPortfolioRepository();

export async function getPortfolioRunsHandler(): Promise<NextResponse> {
  const data = await repo.getPortfolioRuns();
  return NextResponse.json(data);
}

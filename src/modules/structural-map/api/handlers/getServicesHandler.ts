import { NextResponse } from 'next/server';
import { PrismaPortfolioRepository } from '@/modules/structural-map/infrastructure/PrismaPortfolioRepository';

const repo = new PrismaPortfolioRepository();

export async function getServicesHandler(): Promise<NextResponse> {
  const [services, entityTypes, relationTypes] = await Promise.all([
    repo.getServices(),
    repo.getEntityTypes(),
    repo.getRelationTypes(),
  ]);
  return NextResponse.json({ services, entityTypes, relationTypes });
}

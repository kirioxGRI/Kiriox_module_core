import { NextResponse } from 'next/server';
import { PrismaPortfolioRepository } from '@/modules/structural-map/infrastructure/PrismaPortfolioRepository';

const repo = new PrismaPortfolioRepository();

export async function getServicesHandler(): Promise<NextResponse> {
  const [services, entityTypes, relationTypes, allEntities] = await Promise.all([
    repo.getServices(),
    repo.getEntityTypes(),
    repo.getRelationTypes(),
    repo.getAllEntities(),
  ]);
  return NextResponse.json({ services, entityTypes, relationTypes, allEntities });
}

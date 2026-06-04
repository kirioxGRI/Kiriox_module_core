import { NextResponse } from 'next/server';
import { PrismaPortfolioRepository } from '@/modules/structural-map/infrastructure/PrismaPortfolioRepository';
import type { CreateEntityInput } from '@/modules/structural-map/domain/types/PortfolioTypes';

const repo = new PrismaPortfolioRepository();

export async function createEntityHandler(req: Request): Promise<NextResponse> {
  const body = await req.json() as Partial<CreateEntityInput>;
  if (!body.entity_type_id || !body.code || !body.name) {
    return NextResponse.json({ error: 'entity_type_id, code y name son requeridos' }, { status: 400 });
  }
  const result = await repo.createEntity(body as CreateEntityInput);
  return NextResponse.json(result, { status: 201 });
}

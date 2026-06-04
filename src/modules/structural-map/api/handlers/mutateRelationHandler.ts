import { NextResponse } from 'next/server';
import { PrismaPortfolioRepository } from '@/modules/structural-map/infrastructure/PrismaPortfolioRepository';
import type { CreateRelationInput } from '@/modules/structural-map/domain/types/PortfolioTypes';

const repo = new PrismaPortfolioRepository();

export async function createRelationHandler(req: Request): Promise<NextResponse> {
  const body = await req.json() as Partial<CreateRelationInput>;
  if (!body.source_entity_id || !body.target_entity_id || !body.relation_type_id) {
    return NextResponse.json({ error: 'source_entity_id, target_entity_id y relation_type_id son requeridos' }, { status: 400 });
  }
  const result = await repo.createRelation(body as CreateRelationInput);
  return NextResponse.json(result, { status: 201 });
}

export async function deleteRelationHandler(id: string): Promise<NextResponse> {
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  await repo.deleteRelation(id);
  return NextResponse.json({ ok: true });
}

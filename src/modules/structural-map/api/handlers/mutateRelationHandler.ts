import { NextResponse } from 'next/server';
import { PrismaPortfolioRepository } from '@/modules/structural-map/infrastructure/PrismaPortfolioRepository';
import { RelationMutationError } from '@/modules/structural-map/domain/errors/RelationMutationError';
import type { CreateRelationInput, UpdateRelationInput } from '@/modules/structural-map/domain/types/PortfolioTypes';

const repo = new PrismaPortfolioRepository();

function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof RelationMutationError) {
    const status = error.code === 'DUPLICATE_RELATION' ? 409 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  throw error;
}

export async function createRelationHandler(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json() as Partial<CreateRelationInput>;
    if (!body.source_entity_id || !body.target_entity_id || !body.relation_type_id) {
      return NextResponse.json({ error: 'source_entity_id, target_entity_id y relation_type_id son requeridos' }, { status: 400 });
    }
    const result = await repo.createRelation(body as CreateRelationInput);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function deleteRelationHandler(id: string): Promise<NextResponse> {
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  await repo.deleteRelation(id);
  return NextResponse.json({ ok: true });
}

export async function updateRelationHandler(id: string, req: Request): Promise<NextResponse> {
  try {
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    const body = await req.json() as Partial<UpdateRelationInput>;
    const hasUpdate = body.source_entity_id !== undefined
      || body.target_entity_id !== undefined
      || body.relation_type_id !== undefined
      || body.weight !== undefined
      || body.strength !== undefined
      || body.description !== undefined;
    if (!hasUpdate) {
      return NextResponse.json({ error: 'Al menos un campo debe actualizarse' }, { status: 400 });
    }
    await repo.updateRelation(id, body as UpdateRelationInput);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

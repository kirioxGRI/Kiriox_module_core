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

export async function deleteEntityHandler(id: string): Promise<NextResponse> {
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  await repo.deleteEntity(id);
  return NextResponse.json({ ok: true });
}

export async function updateEntityHandler(id: string, req: Request): Promise<NextResponse> {
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  const body = await req.json() as { name?: string; description?: string | null; criticality_level?: string; status?: string };
  const hasUpdate = body.name !== undefined || body.description !== undefined || body.criticality_level !== undefined || body.status !== undefined;
  if (!hasUpdate) return NextResponse.json({ error: 'Al menos un campo debe actualizarse' }, { status: 400 });
  await repo.updateEntity(id, body);
  return NextResponse.json({ ok: true });
}

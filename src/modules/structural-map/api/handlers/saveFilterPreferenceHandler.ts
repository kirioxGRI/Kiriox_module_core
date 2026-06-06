import { NextResponse } from 'next/server';
import { PrismaFilterRepository } from '@/modules/structural-map/infrastructure/PrismaFilterRepository';
import type { StructuralMapFilterPreferenceInput } from '@/modules/structural-map/domain/types/FilterTypes';

const repo = new PrismaFilterRepository();

export async function saveFilterPreferenceHandler(req: Request): Promise<NextResponse> {
  const body = await req.json() as Partial<StructuralMapFilterPreferenceInput>;

  if (!body.entityId) {
    return NextResponse.json({ error: 'entityId es requerido' }, { status: 400 });
  }
  if (!body.defaultViewCode) {
    return NextResponse.json({ error: 'defaultViewCode es requerido' }, { status: 400 });
  }
  if (typeof body.defaultDepth !== 'number' || Number.isNaN(body.defaultDepth)) {
    return NextResponse.json({ error: 'defaultDepth es requerido' }, { status: 400 });
  }
  if (!body.defaultMode) {
    return NextResponse.json({ error: 'defaultMode es requerido' }, { status: 400 });
  }

  const preference = await repo.savePreference({
    entityId: body.entityId,
    defaultViewCode: body.defaultViewCode,
    defaultDepth: body.defaultDepth,
    defaultMode: body.defaultMode,
  });

  return NextResponse.json(preference);
}
